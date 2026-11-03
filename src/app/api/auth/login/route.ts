import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, ensureDemoUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (name) {
    if (!email || !email.includes("@") || password.length < 8 || password.length > 128 || name.length > 100) {
      return NextResponse.json(
        { error: "Informe nome, e-mail válido e senha de 8 a 128 caracteres" },
        { status: 400 }
      );
    }
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    try {
      const user = await db.user.create({
        data: { name, email, password: hashPassword(password), role: "USER" },
      });
      await createSession(user.id);
      return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch {
      return NextResponse.json({ error: "Não foi possível criar a conta. Verifique seus dados." }, { status: 400 });
    }
  }

  if (email && password) {
    const demoAllowed = process.env.NODE_ENV !== "production" || process.env.BLOOM_DEMO_ENABLED === "true";
    if (email === "demo@bloom.studio" && !demoAllowed) {
      return NextResponse.json({ error: "Conta demo desativada neste ambiente" }, { status: 403 });
    }
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Migração sem perda de acesso: substitui a senha antiga em texto por hash.
    if (!user.password.startsWith("scrypt$")) {
      await db.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password) },
      });
    }
    await createSession(user.id);
    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  }

  // Demonstração somente mediante opt-in explícito e jamais de forma automática.
  if (body.demo === true && (process.env.NODE_ENV !== "production" || process.env.BLOOM_DEMO_ENABLED === "true")) {
    const demoUser = await ensureDemoUser();
    await createSession(demoUser.id);
    return NextResponse.json({
      id: demoUser.id, name: demoUser.name, email: demoUser.email, role: demoUser.role, demo: true,
    });
  }

  return NextResponse.json({ error: "Informe e-mail e senha" }, { status: 400 });
}
