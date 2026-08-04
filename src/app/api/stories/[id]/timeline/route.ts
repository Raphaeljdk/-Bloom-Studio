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
  const { title, description, date } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  // Calcula próxima ordem
  const last = await db.timelineEvent.findFirst({
    where: { storyId: id },
    orderBy: { order: "desc" },
  });
  const order = (last?.order || 0) + 1;

  const event = await db.timelineEvent.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      date: date?.trim() || null,
      order,
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
  const events = await db.timelineEvent.findMany({
    where: { storyId: id, story: { userId: user.id } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(events);
}
