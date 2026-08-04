import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
      annotations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!story) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  return NextResponse.json({
    id: story.id,
    title: story.title,
    description: story.description,
    status: story.status,
    colorTheme: story.colorTheme,
    genre: story.genre,
    tone: story.tone,
    characters: story.characters,
    chapters: story.chapters,
    timeline: story.timelineEvents,
    events: story.importantEvents,
    annotations: story.annotations,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, genre, tone } = body;

  const updated = await db.story.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(genre !== undefined && { genre }),
      ...(tone !== undefined && { tone }),
    },
  });

  if (updated.count === 0)
    return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await db.story.deleteMany({ where: { id, userId: user.id } });
  return new NextResponse(null, { status: 204 });
}
