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
  const { title, description, impact } = body;
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Título e descrição são obrigatórios" }, { status: 400 });
  }

  const event = await db.importantEvent.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      impact: impact?.trim() || null,
      isApproved: true,
      suggestedBy: "USER",
      storyId: id,
    },
  });

  return NextResponse.json(event);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const events = await db.importantEvent.findMany({
    where: { storyId: id, story: { userId: user.id } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(events);
}
