import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/stories
 * Lista TODAS as histórias de TODOS os usuários (visão admin).
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const stories = await db.story.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { chapters: true, characters: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Busca coverUrl via SQL direto (fallback cache)
  const ids = stories.map((s) => s.id);
  const coverMap: Record<string, { coverUrl: string | null }> = {};
  for (const id of ids) {
    try {
      const rows = await db.$queryRaw<Array<{ coverUrl: string | null }>>`SELECT coverUrl FROM Story WHERE id = ${id}`;
      if (rows[0]) coverMap[id] = { coverUrl: rows[0].coverUrl };
    } catch { /* ignora */ }
  }

  return NextResponse.json(
    stories.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      genre: s.genre,
      tone: s.tone,
      coverUrl: coverMap[s.id]?.coverUrl ?? null,
      chaptersCount: s._count.chapters,
      charactersCount: s._count.characters,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      user: s.user,
    }))
  );
}
