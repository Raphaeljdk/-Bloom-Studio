import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, createSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string" ||
      newPassword.length < 12 || newPassword.length > 128) {
    return NextResponse.json({ error: "Informe a senha atual e uma nova senha de 12 a 128 caracteres" }, { status: 400 });
  }

  if (!verifyPassword(currentPassword, user.password)) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 403 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Escolha uma senha diferente da anterior" }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { password: hashPassword(newPassword) },
  });
  // Nova sessão é assinada com hash novo; cookies de outros dispositivos expiram.
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
