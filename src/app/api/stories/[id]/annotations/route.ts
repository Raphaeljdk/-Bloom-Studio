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
  const { content, category } = body;
  if (!content?.trim()) {
    return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 });
  }

  const annotation = await db.annotation.create({
    data: {
      content: content.trim(),
      category: (category || "IDEA").toUpperCase(),
      storyId: id,
    },
  });

  return NextResponse.json(annotation);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const annotations = await db.annotation.findMany({
    where: { storyId: id, story: { userId: user.id } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(annotations);
}
