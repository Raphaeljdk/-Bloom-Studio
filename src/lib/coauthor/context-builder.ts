// ========================================================
// CONTEXT BUILDER — Bloom Studio
// Serializa TODA a história para o prompt da coautora Flora
// ========================================================

import { db } from "@/lib/db";

export interface StoryContext {
  storyId: string;
  title: string;
  description: string | null;
  status: string;
  genre: string | null;
  tone: string | null;
  characters: Array<{
    id: string;
    name: string;
    description: string | null;
    role: string | null;
    traits: string | null;
  }>;
  chapters: Array<{
    id: string;
    number: number;
    title: string | null;
    summary: string | null;
    status: string;
  }>;
  timelineEvents: Array<{
    id: string;
    title: string;
    description: string | null;
    order: number;
    date: string | null;
  }>;
  importantEvents: Array<{
    id: string;
    title: string;
    description: string;
    impact: string | null;
    isApproved: boolean;
    suggestedBy: string;
  }>;
  annotations: Array<{
    id: string;
    content: string;
    category: string;
  }>;
  recentMessages: Array<{
    role: string;
    content: string;
  }>;
}

/**
 * Carrega TODO o contexto de uma história do banco.
 */
export async function loadStoryContext(storyId: string): Promise<StoryContext | null> {
  const story = await db.story.findUnique({
    where: { id: storyId },
    include: {
      characters: { orderBy: { createdAt: "asc" } },
      chapters: { orderBy: { number: "asc" } },
      timelineEvents: { orderBy: { order: "asc" } },
      importantEvents: { orderBy: { createdAt: "asc" } },
      annotations: { orderBy: { createdAt: "desc" }, take: 30 },
      chatSessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });

  if (!story) return null;

  const recentMessages = story.chatSessions[0]?.messages
    .slice()
    .reverse()
    .map((m) => ({ role: m.role, content: m.content })) ?? [];

  return {
    storyId: story.id,
    title: story.title,
    description: story.description,
    status: story.status,
    genre: story.genre,
    tone: story.tone,
    characters: story.characters,
    chapters: story.chapters,
    timelineEvents: story.timelineEvents,
    importantEvents: story.importantEvents,
    annotations: story.annotations,
    recentMessages,
  };
}

/**
 * Serializa o contexto em texto estruturado para o prompt.
 */
export function serializeContext(ctx: StoryContext): string {
  const lines: string[] = [];

  lines.push("═══════ HISTÓRIA ═══════");
  lines.push(`Título: ${ctx.title}`);
  if (ctx.description) lines.push(`Descrição: ${ctx.description}`);
  lines.push(`Status: ${ctx.status}`);
  if (ctx.genre) lines.push(`Gênero: ${ctx.genre}`);
  if (ctx.tone) lines.push(`Tom: ${ctx.tone}`);
  lines.push("");

  // Personagens
  lines.push("═══════ PERSONAGENS ═══════");
  if (ctx.characters.length === 0) {
    lines.push("(Nenhum personagem cadastrado ainda)");
  } else {
    ctx.characters.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}${c.role ? ` — ${c.role}` : ""}`);
      if (c.description) lines.push(`   Descrição: ${c.description}`);
      if (c.traits) lines.push(`   Traços: ${c.traits}`);
    });
  }
  lines.push("");

  // Capítulos
  lines.push("═══════ CAPÍTULOS ═══════");
  if (ctx.chapters.length === 0) {
    lines.push("(Nenhum capítulo cadastrado ainda)");
  } else {
    ctx.chapters.forEach((ch) => {
      lines.push(`Cap. ${ch.number}${ch.title ? ` — ${ch.title}` : ""} [${ch.status}]`);
      if (ch.summary) lines.push(`   Resumo: ${ch.summary}`);
      // Inclui o conteúdo completo do capítulo (até 2000 chars) para a Flora poder ler e continuar
      if (ch.content) {
        const contentPreview = ch.content.length > 2000
          ? ch.content.slice(0, 2000) + "... [truncado]"
          : ch.content;
        lines.push(`   Conteúdo: ${contentPreview}`);
      }
    });
  }
  lines.push("");

  // Linha do tempo
  lines.push("═══════ LINHA DO TEMPO ═══════");
  if (ctx.timelineEvents.length === 0) {
    lines.push("(Nenhuma entrada na cronologia ainda)");
  } else {
    ctx.timelineEvents.forEach((t, i) => {
      lines.push(`${i + 1}. ${t.title}${t.date ? ` (${t.date})` : ""}`);
      if (t.description) lines.push(`   ${t.description}`);
    });
  }
  lines.push("");

  // Acontecimentos importantes
  const approved = ctx.importantEvents.filter((e) => e.isApproved);
  const pending = ctx.importantEvents.filter((e) => !e.isApproved);
  lines.push("═══════ ACONTECIMENTOS IMPORTANTES (APROVADOS) ═══════");
  if (approved.length === 0) {
    lines.push("(Nenhum acontecimento importante aprovado ainda)");
  } else {
    approved.forEach((e, i) => {
      lines.push(`${i + 1}. ${e.title}`);
      lines.push(`   ${e.description}`);
      if (e.impact) lines.push(`   Impacto: ${e.impact}`);
    });
  }
  if (pending.length > 0) {
    lines.push("");
    lines.push("═══════ SUGESTÕES PENDENTES DE APROVAÇÃO ═══════");
    pending.forEach((e, i) => {
      lines.push(`${i + 1}. ${e.title} (sugerido por ${e.suggestedBy === "COAUTHOR" ? "Flora" : "você"})`);
      lines.push(`   ${e.description}`);
    });
  }
  lines.push("");

  // Anotações
  lines.push("═══════ ANOTAÇÕES ═══════");
  if (ctx.annotations.length === 0) {
    lines.push("(Nenhuma anotação ainda)");
  } else {
    const byCategory: Record<string, string[]> = {};
    ctx.annotations.forEach((a) => {
      if (!byCategory[a.category]) byCategory[a.category] = [];
      byCategory[a.category].push(a.content);
    });
    Object.entries(byCategory).forEach(([cat, items]) => {
      lines.push(`[${cat}]`);
      items.forEach((it) => lines.push(`  • ${it}`));
    });
  }
  lines.push("");

  // Mensagens recentes
  lines.push("═══════ CONVERSA RECENTE (últimas 20 mensagens) ═══════");
  if (ctx.recentMessages.length === 0) {
    lines.push("(Início da conversa)");
  } else {
    ctx.recentMessages.forEach((m) => {
      const speaker = m.role === "USER" ? "Autor(a)" : m.role === "ASSISTANT" ? "Flora" : "Sistema";
      lines.push(`${speaker}: ${m.content}`);
    });
  }

  return lines.join("\n");
}
