import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/stories/[id]/export
 * Exporta a história completa em Markdown estruturado.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const story = await db.story.findFirst({
    where: { id, userId: user.id },
    include: {
      characters: { orderBy: { createdAt: "asc" } },
      chapters: { orderBy: { number: "asc" } },
      timelineEvents: { orderBy: { order: "asc" } },
      importantEvents: { orderBy: { createdAt: "asc" } },
      annotations: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!story) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const md: string[] = [];
  md.push(`# ${story.title}\n`);
  if (story.description) md.push(`> ${story.description}\n`);
  md.push(`**Status:** ${story.status}  `);
  if (story.genre) md.push(`**Gênero:** ${story.genre}  `);
  if (story.tone) md.push(`**Tom:** ${story.tone}  `);
  md.push(`**Atualizado em:** ${story.updatedAt.toISOString().slice(0, 10)}\n`);

  // Personagens
  md.push(`## Personagens\n`);
  if (story.characters.length === 0) {
    md.push(`_Nenhum personagem cadastrado._\n`);
  } else {
    story.characters.forEach((c, i) => {
      md.push(`### ${i + 1}. ${c.name}${c.role ? ` — _${c.role}_` : ""}\n`);
      if (c.description) md.push(`${c.description}\n`);
      if (c.traits) md.push(`**Traços:** ${c.traits}\n`);
    });
  }

  // Linha do tempo
  md.push(`## Cronologia\n`);
  if (story.timelineEvents.length === 0) {
    md.push(`_Sem eventos cronológicos._\n`);
  } else {
    story.timelineEvents.forEach((t, i) => {
      md.push(`### ${i + 1}. ${t.title}${t.date ? ` _(${t.date})_` : ""}\n`);
      if (t.description) md.push(`${t.description}\n`);
    });
  }

  // Capítulos
  md.push(`## Capítulos\n`);
  if (story.chapters.length === 0) {
    md.push(`_Nenhum capítulo escrito ainda._\n`);
  } else {
    story.chapters.forEach((c) => {
      md.push(`### Capítulo ${c.number}${c.title ? ` — ${c.title}` : ""} [${c.status}]\n`);
      if (c.summary) md.push(`> ${c.summary}\n`);
      if (c.content) md.push(`${c.content}\n`);
      md.push(`---\n`);
    });
  }

  // Acontecimentos importantes
  const approved = story.importantEvents.filter((e) => e.isApproved);
  md.push(`## Acontecimentos Importantes\n`);
  if (approved.length === 0) {
    md.push(`_Nenhum evento importante aprovado._\n`);
  } else {
    approved.forEach((e, i) => {
      md.push(`### ${i + 1}. ${e.title}\n`);
      md.push(`${e.description}\n`);
      if (e.impact) md.push(`**Impacto:** ${e.impact}\n`);
    });
  }

  // Anotações
  md.push(`## Anotações\n`);
  if (story.annotations.length === 0) {
    md.push(`_Sem anotações._\n`);
  } else {
    const byCat: Record<string, string[]> = {};
    story.annotations.forEach((a) => {
      if (!byCat[a.category]) byCat[a.category] = [];
      byCat[a.category].push(a.content);
    });
    Object.entries(byCat).forEach(([cat, items]) => {
      md.push(`### ${cat}\n`);
      items.forEach((it) => md.push(`- ${it}`));
      md.push(`\n`);
    });
  }

  md.push(`\n---\n_Gerado por Bloom Studio 🌸_\n`);

  const markdown = md.join("\n");
  const filename = `${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;

  return NextResponse.json({ markdown, filename });
}
