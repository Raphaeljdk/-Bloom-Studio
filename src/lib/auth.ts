// ========================================================
// AUTH UTILS — Sessão simples baseada em cookie (demo)
// ========================================================
// Para fins do Bloom Studio, usamos uma sessão leve baseada em
// cookie assinado com o user ID. Não é NextAuth completo, mas
// atende ao fluxo de login/registro com persistência real no banco.

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import crypto from "crypto";

const SESSION_COOKIE = "bloom_session";
const SECRET = process.env.JWT_SECRET || "bloom-studio-dev-secret-2026";

function sign(payload: string): string {
  const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  if (sig !== expected) return null;
  return payload;
}

/**
 * Cria sessão para um usuário (server-side).
 */
export async function createSession(userId: string): Promise<void> {
  const token = sign(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
}

/**
 * Lê o usuário atual a partir do cookie de sessão.
 */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = verify(token);
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  return user;
}

/**
 * Verifica se o usuário atual é admin.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'ADMIN';
}

/**
 * Garante que o usuário é admin — lança erro se não for.
 * Busca role via SQL direto para contornar cache do Turbopack.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado");

  // Tenta via Prisma Client
  let role = user.role;
  if (!role) {
    try {
      const rows = await db.$queryRaw<Array<{ role: string }>>`SELECT role FROM User WHERE id = ${user.id}`;
      role = rows[0]?.role;
    } catch {
      // ignora
    }
  }

  if (role !== 'ADMIN') {
    throw new Error("Acesso restrito a administradores");
  }
  return { ...user, role };
}

/**
 * Logout: remove o cookie.
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Garante um usuário demo (para desenvolvimento e primeira visita).
 * Se não houver nenhum usuário ainda, cria um.
 */
export async function ensureDemoUser() {
  const existing = await db.user.findFirst({
    where: { email: "demo@bloom.studio" },
  });
  if (existing) return existing;

  return db.user.create({
    data: {
      name: "Escritora Bloom",
      email: "demo@bloom.studio",
      password: "bloom-demo",
    },
  });
}
