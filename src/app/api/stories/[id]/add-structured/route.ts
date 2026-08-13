import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseStructuredContent } from "@/lib/coauthor/structured-parser";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

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
  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo vazio" }, { status: 400 });

  const parsed = parseStructuredContent(content);

  if (!parsed.hasStructure) {
    return NextResponse.json({
      ok: false,
      message: "Não encontrei estrutura no texto. A Flora precisa usar marcadores como 'CAPÍTULOS', 'PERSONAGENS', etc.",
    });
  }

  const added = { chapters: 0, characters: 0, timeline: 0, events: 0, annotations: 0 };

  try {
    if (parsed.chapters.length > 0) {
      const lastChapter = await db.chapter.findFirst({ where: { storyId: id }, orderBy: { number: "desc" } });
      let chapterNum = lastChapter?.number || 0;
      for (const ch of parsed.chapters) {
        chapterNum++;
        const num = ch.number || chapterNum;
        const hasContent = ch.content && ch.content.trim().length > 0;
        await db.chapter.create({
          data: {
            number: num,
            title: ch.title || `Capítulo ${num}`,
            summary: ch.summary || null,
            content: ch.content || ch.summary || null,
            status: hasContent ? "WRITING" : "DRAFT",
            storyId: id,
          },
        });
        added.chapters++;
      }
    }

    if (parsed.characters.length > 0) {
      for (const char of parsed.characters) {
        if (!char.name?.trim()) continue;
        await db.character.create({
          data: {
            name: char.name.trim(),
            role: char.role?.trim() || null,
            description: char.description?.trim() || null,
            traits: char.traits?.trim() || null,
            storyId: id,
          },
        });
        added.characters++;
      }
    }

    if (parsed.timeline.length > 0) {
      const lastTimeline = await db.timelineEvent.findFirst({ where: { storyId: id }, orderBy: { order: "desc" } });
      let order = lastTimeline?.order || 0;
      for (const event of parsed.timeline) {
        if (!event.title?.trim()) continue;
        order++;
        await db.timelineEvent.create({
          data: {
            title: event.title.trim(),
            date: event.date?.trim() || null,
            description: event.description?.trim() || null,
            order,
            storyId: id,
          },
        });
        added.timeline++;
      }
    }

    if (parsed.events.length > 0) {
      for (const event of parsed.events) {
        if (!event.title?.trim() || !event.description?.trim()) continue;
        await db.importantEvent.create({
          data: {
            title: event.title.trim(),
            description: event.description.trim(),
            impact: event.impact?.trim() || null,
            isApproved: true,
            suggestedBy: "USER",
            storyId: id,
          },
        });
        added.events++;
      }
    }

    if (parsed.annotations.length > 0) {
      for (const ann of parsed.annotations) {
        if (!ann.content?.trim()) continue;
        const validCategories = ["IDEA", "QUESTION", "DECISION", "OBSERVATION"];
        const category = validCategories.includes(ann.category.toUpperCase()) ? ann.category.toUpperCase() : "IDEA";
        await db.annotation.create({
          data: { content: ann.content.trim(), category, storyId: id },
        });
        added.annotations++;
      }
    }

    const parts: string[] = [];
    if (added.chapters) parts.push(`${added.chapters} capítulo(s)`);
    if (added.characters) parts.push(`${added.characters} personagem(ns)`);
    if (added.timeline) parts.push(`${added.timeline} evento(s) cronológico(s)`);
    if (added.events) parts.push(`${added.events} acontecimento(s) importante(s)`);
    if (added.annotations) parts.push(`${added.annotations} anotação(ões)`);

    const summary = parts.length === 0 ? "Nada extraído." : `Adicionado: ${parts.join(", ")}`;

    return NextResponse.json({ ok: true, added, summary });
  } catch (err) {
    console.error("[add-structured] erro:", err);
    return NextResponse.json({ error: "Erro ao adicionar" }, { status: 500 });
  }
}
