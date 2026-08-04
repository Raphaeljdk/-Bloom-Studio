import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  // Busca role via SQL direto (fallback para Prisma Client em cache)
  let role = "USER";
  try {
    const rows = await db.$queryRaw<Array<{ role: string }>>`SELECT role FROM User WHERE id = ${user.id}`;
    if (rows[0]?.role) role = rows[0].role;
  } catch {
    // ignora
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
    },
  });
}
