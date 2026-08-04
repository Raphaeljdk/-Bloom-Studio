import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const stories = await db.story.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { chapters: true, characters: true } },
    },
  });

  // Busca coverUrl/coverStyle via SQL direto (fallback para Prisma Client em cache)
  // SQLite não suporta IN com array via Prisma template — usa query individual
  let coverMap: Record<string, { coverUrl: string | null; coverStyle: string | null }> = {};
  for (const s of stories) {
    try {
      const coverRows = await db.$queryRaw<Array<{ coverUrl: string | null; coverStyle: string | null }>>`SELECT coverUrl, coverStyle FROM Story WHERE id = ${s.id}`;
      if (coverRows && coverRows[0]) {
        coverMap[s.id] = { coverUrl: coverRows[0].coverUrl, coverStyle: coverRows[0].coverStyle };
      }
    } catch {
      // ignora
    }
  }

  return NextResponse.json(
    stories.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      colorTheme: s.colorTheme,
      genre: s.genre,
      tone: s.tone,
      coverUrl: coverMap[s.id]?.coverUrl ?? null,
      coverStyle: coverMap[s.id]?.coverStyle ?? null,
      chaptersCount: s._count.chapters,
      charactersCount: s._count.characters,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { title, description, genre, tone } = body;
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  const story = await db.story.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      genre: genre?.trim() || null,
      tone: tone?.trim() || null,
      userId: user.id,
    },
  });

  // Cria sessão de chat automaticamente
  await db.chatSession.create({
    data: { storyId: story.id, title: "Conversa com Flora" },
  });

  return NextResponse.json({
    id: story.id,
    title: story.title,
    description: story.description,
    status: story.status,
    colorTheme: story.colorTheme,
    genre: story.genre,
    tone: story.tone,
    coverUrl: story.coverUrl,
    coverStyle: story.coverStyle,
    chaptersCount: 0,
    charactersCount: 0,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  });
}
