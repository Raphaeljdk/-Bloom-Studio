import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
  const { number, title } = body;

  // Se número não informado, calcula próximo
  let chapterNumber = number;
  if (!chapterNumber) {
    const last = await db.chapter.findFirst({
      where: { storyId: id },
      orderBy: { number: "desc" },
    });
    chapterNumber = (last?.number || 0) + 1;
  }

  const chapter = await db.chapter.create({
    data: {
      number: chapterNumber,
      title: title?.trim() || null,
      storyId: id,
    },
  });

  return NextResponse.json(chapter);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const chapters = await db.chapter.findMany({
    where: { storyId: id, story: { userId: user.id } },
    orderBy: { number: "asc" },
  });
  return NextResponse.json(chapters);
}
