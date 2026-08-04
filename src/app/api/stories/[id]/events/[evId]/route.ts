import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; evId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, evId } = await params;
  const body = await req.json();
  const { title, description, impact, isApproved } = body;

  const updated = await db.importantEvent.updateMany({
    where: { id: evId, storyId: id, story: { userId: user.id } },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(impact !== undefined && { impact }),
      ...(isApproved !== undefined && { isApproved }),
    },
  });

  if (updated.count === 0)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; evId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, evId } = await params;
  await db.importantEvent.deleteMany({
    where: { id: evId, storyId: id, story: { userId: user.id } },
  });
  return new NextResponse(null, { status: 204 });
}
