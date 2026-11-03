import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || name.length > 100 || !email.includes("@") || password.length < 8 || password.length > 128) {
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
    return NextResponse.json({ error: "Não foi possível criar a conta" }, { status: 400 });
  }
}
