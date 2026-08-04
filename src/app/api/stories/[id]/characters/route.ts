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
  const { name, description, role, traits } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const character = await db.character.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      role: role?.trim() || null,
      traits: traits?.trim() || null,
      storyId: id,
    },
  });

  return NextResponse.json(character);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const characters = await db.character.findMany({
    where: { storyId: id, story: { userId: user.id } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(characters);
}
