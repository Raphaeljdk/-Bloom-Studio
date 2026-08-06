import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { aiChatCompletion } from "@/lib/ai-client";

/**
 * POST /api/stories/[id]/organize-free-write
 * Recebe o texto da escrita livre, usa IA para extrair entidades
 * (personagens, capítulos, eventos cronológicos, anotações, acontecimentos)
 * e adiciona automaticamente à história.
 *
 * Body: { content: string }
 * Response: { added: { characters: N, chapters: N, timeline: N, annotations: N, events: N }, summary: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const story = await db.story.findFirst({ where: { id, userId: user.id } });
  if (!story) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const body = await req.json();
  const { content } = body as { content?: string };

  if (!content || content.trim().length < 50) {
    return NextResponse.json(
      { error: "Texto muito curto. Escreva pelo menos 50 caracteres para organizar." },
      { status: 400 }
    );
  }

  // Prompt para a IA extrair estruturas do texto livre
  const extractionPrompt = `Você é uma assistente editorial. Analise o texto livre abaixo escrito por um autor e EXTRAIA estruturas narrativas organizadas.

**Texto livre do autor:**
"""
${content.slice(0, 8000)}
"""

**Sua tarefa:**
Identifique no texto:
1. **Personagens** — qualquer personagem mencionado ou implícito (nome, função, descrição, traços)
2. **Capítulos** — cenas ou segmentos que poderiam ser capítulos (título + resumo)
3. **Eventos cronológicos** — acontecimentos na ordem temporal (título, data/período, descrição)
4. **Acontecimentos importantes** — momentos cruciais da trama (título, descrição, impacto)
5. **Anotações** — ideias, perguntas, decisões, observações sobre a escrita (categoria + conteúdo)

**Formato de resposta (JSON válido, sem markdown):**
{
  "characters": [{"name": "...", "role": "...", "description": "...", "traits": "..."}],
  "chapters": [{"title": "...", "summary": "..."}],
  "timeline": [{"title": "...", "date": "...", "description": "..."}],
  "events": [{"title": "...", "description": "...", "impact": "..."}],
  "annotations": [{"category": "IDEA|QUESTION|DECISION|OBSERVATION", "content": "..."}]
}

**Regras:**
- Responda APENAS com JSON válido (sem markdown, sem texto antes ou depois)
- Categorias de anotação: IDEA, QUESTION, DECISION, OBSERVATION
- Se não encontrar nada em uma categoria, use array vazio []
- Seja conciso nos campos (máx 200 chars por campo)
- Máximo 5 personagens, 5 capítulos, 5 eventos cronológicos, 3 acontecimentos, 5 anotações
- Não invente — só extraia o que está realmente no texto
- Se o texto não tiver estrutura clara, extraia o que conseguir inferir`;

  let parsed: {
    characters?: Array<{ name: string; role?: string; description?: string; traits?: string }>;
    chapters?: Array<{ title: string; summary?: string }>;
    timeline?: Array<{ title: string; date?: string; description?: string }>;
    events?: Array<{ title: string; description: string; impact?: string }>;
    annotations?: Array<{ category: string; content: string }>;
  };

  try {
    const response = await aiChatCompletion(
      [
        { role: "system", content: "Você é uma assistente editorial que extrai estruturas narrativas de textos livres. Responda sempre em JSON válido, sem markdown." },
        { role: "user", content: extractionPrompt },
      ],
      { temperature: 0.3, max_tokens: 1500 }
    );

    // Limpa a resposta (remove markdown se houver)
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    parsed = JSON.parse(cleanResponse);
  } catch (err) {
    console.error("[organize-free-write] erro ao extrair:", err);
    return NextResponse.json(
      { error: "Erro ao analisar o texto. Tente novamente em alguns instantes." },
      { status: 500 }
    );
  }

  // Persiste as entidades extraídas no banco
  const added = {
    characters: 0,
    chapters: 0,
    timeline: 0,
    events: 0,
    annotations: 0,
  };

  try {
    // Personagens
    if (parsed.characters && parsed.characters.length > 0) {
      for (const c of parsed.characters.slice(0, 5)) {
        if (!c.name?.trim()) continue;
        await db.character.create({
          data: {
            name: c.name.trim(),
            role: c.role?.trim() || null,
            description: c.description?.trim() || null,
            traits: c.traits?.trim() || null,
            storyId: id,
          },
        });
        added.characters++;
      }
    }

    // Capítulos
    if (parsed.chapters && parsed.chapters.length > 0) {
      // Busca último número de capítulo
      const lastChapter = await db.chapter.findFirst({
        where: { storyId: id },
        orderBy: { number: "desc" },
      });
      let chapterNum = lastChapter?.number || 0;

      for (const c of parsed.chapters.slice(0, 5)) {
        if (!c.title?.trim() && !c.summary?.trim()) continue;
        chapterNum++;
        await db.chapter.create({
          data: {
            number: chapterNum,
            title: c.title?.trim() || `Capítulo ${chapterNum}`,
            summary: c.summary?.trim() || null,
            storyId: id,
          },
        });
        added.chapters++;
      }
    }

    // Eventos cronológicos
    if (parsed.timeline && parsed.timeline.length > 0) {
      const lastTimeline = await db.timelineEvent.findFirst({
        where: { storyId: id },
        orderBy: { order: "desc" },
      });
      let order = lastTimeline?.order || 0;

      for (const t of parsed.timeline.slice(0, 5)) {
        if (!t.title?.trim()) continue;
        order++;
        await db.timelineEvent.create({
          data: {
            title: t.title.trim(),
            date: t.date?.trim() || null,
            description: t.description?.trim() || null,
            order,
            storyId: id,
          },
        });
        added.timeline++;
      }
    }

    // Acontecimentos importantes (auto-aprovados)
    if (parsed.events && parsed.events.length > 0) {
      for (const e of parsed.events.slice(0, 3)) {
        if (!e.title?.trim() || !e.description?.trim()) continue;
        await db.importantEvent.create({
          data: {
            title: e.title.trim(),
            description: e.description.trim(),
            impact: e.impact?.trim() || null,
            isApproved: true,
            suggestedBy: "USER",
            storyId: id,
          },
        });
        added.events++;
      }
    }

    // Anotações
    if (parsed.annotations && parsed.annotations.length > 0) {
      for (const a of parsed.annotations.slice(0, 5)) {
        if (!a.content?.trim()) continue;
        const category = (a.category || "IDEA").toUpperCase();
        const validCategories = ["IDEA", "QUESTION", "DECISION", "OBSERVATION"];
        await db.annotation.create({
          data: {
            category: validCategories.includes(category) ? category : "IDEA",
            content: a.content.trim(),
            storyId: id,
          },
        });
        added.annotations++;
      }
    }
  } catch (err) {
    console.error("[organize-free-write] erro ao persistir:", err);
    return NextResponse.json(
      { error: "Erro ao salvar entidades extraídas." },
      { status: 500 }
    );
  }

  // Gera resumo do que foi extraído
  const total = added.characters + added.chapters + added.timeline + added.events + added.annotations;
  const summaryParts: string[] = [];
  if (added.characters) summaryParts.push(`${added.characters} personagem(ns)`);
  if (added.chapters) summaryParts.push(`${added.chapters} capítulo(s)`);
  if (added.timeline) summaryParts.push(`${added.timeline} evento(s) cronológico(s)`);
  if (added.events) summaryParts.push(`${added.events} acontecimento(s) importante(s)`);
  if (added.annotations) summaryParts.push(`${added.annotations} anotação(ões)`);
  const summary = total === 0
    ? "Não consegui identificar estruturas claras no texto. Tente escrever mais detalhes."
    : `Extraí e adicionei: ${summaryParts.join(", ")}.`;

  return NextResponse.json({ added, summary });
}
