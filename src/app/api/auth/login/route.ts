import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, ensureDemoUser } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password, name } = body;

  // Fluxo de registro
  if (name && email && password) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
    const user = await db.user.create({
      data: { name, email, password, role: "USER" },
    });
    await createSession(user.id);
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }

  // Fluxo de login
  if (email && password) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }
    await createSession(user.id);
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }

  // Fluxo demo: entra automaticamente como usuário demo (que é ADMIN)
  const demo = await ensureDemoUser();
  await createSession(demo.id);
  return NextResponse.json({
    id: demo.id,
    name: demo.name,
    email: demo.email,
    role: demo.role,
    demo: true,
  });
}
