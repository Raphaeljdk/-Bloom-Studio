import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * PATCH /api/admin/users/[userId]
 * Atualiza role do usuário (promover/rebaixar admin).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { role } = body;

  if (!["USER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Role inválido" }, { status: 400 });
  }

  // Fallback SQL direto para contornar cache do Turbopack
  try {
    await db.user.update({
      where: { id: userId },
      data: { role },
    });
  } catch {
    await db.$executeRaw`UPDATE User SET role = ${role}, updatedAt = ${new Date()} WHERE id = ${userId}`;
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/users/[userId]
 * Remove um usuário (e todas as suas histórias em cascata).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { userId } = await params;
  await db.user.delete({ where: { id: userId } });
  return new NextResponse(null, { status: 204 });
}
