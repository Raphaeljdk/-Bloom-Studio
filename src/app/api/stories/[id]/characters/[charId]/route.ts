import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, charId } = await params;
  const body = await req.json();
  const { name, description, role, traits } = body;

  const updated = await db.character.updateMany({
    where: { id: charId, storyId: id, story: { userId: user.id } },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(role !== undefined && { role }),
      ...(traits !== undefined && { traits }),
    },
  });

  if (updated.count === 0)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, charId } = await params;
  await db.character.deleteMany({
    where: { id: charId, storyId: id, story: { userId: user.id } },
  });
  return new NextResponse(null, { status: 204 });
}
