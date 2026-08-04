import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; annId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id, annId } = await params;
  await db.annotation.deleteMany({
    where: { id: annId, storyId: id, story: { userId: user.id } },
  });
  return new NextResponse(null, { status: 204 });
}
