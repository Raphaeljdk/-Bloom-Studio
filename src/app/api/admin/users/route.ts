import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/users
 * Lista todos os usuários com contagem de histórias.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  // Busca usuários + role via SQL direto (fallback para Prisma Client em cache)
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { stories: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Busca roles individualmente via SQL (contorna cache)
  const usersWithRoles = await Promise.all(
    users.map(async (u) => {
      let role = "USER";
      try {
        const rows = await db.$queryRaw<Array<{ role: string }>>`SELECT role FROM User WHERE id = ${u.id}`;
        if (rows[0]?.role) role = rows[0].role;
      } catch { /* ignora */ }
      return { ...u, role };
    })
  );

  return NextResponse.json(
    usersWithRoles.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      storiesCount: u._count.stories,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
  );
}
