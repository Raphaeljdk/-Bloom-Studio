import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; chapId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, chapId } = await params;
  const body = await req.json();
  const { number, title, summary, content, status } = body;

  const updated = await db.chapter.updateMany({
    where: { id: chapId, storyId: id, story: { userId: user.id } },
    data: {
      ...(number !== undefined && { number }),
      ...(title !== undefined && { title }),
      ...(summary !== undefined && { summary }),
      ...(content !== undefined && { content }),
      ...(status !== undefined && { status }),
    },
  });

  if (updated.count === 0)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; chapId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, chapId } = await params;
  await db.chapter.deleteMany({
    where: { id: chapId, storyId: id, story: { userId: user.id } },
  });
  return new NextResponse(null, { status: 204 });
}
