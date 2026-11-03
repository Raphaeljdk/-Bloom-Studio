// ========================================================
// AUTH UTILS — Sessão simples baseada em cookie (demo)
// ========================================================
// Para fins do Bloom Studio, usamos uma sessão leve baseada em
// cookie assinado com o user ID. Não é NextAuth completo, mas
// atende ao fluxo de login/registro com persistência real no banco.

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import crypto from "crypto";
import { hashPassword } from "@/lib/password";

const SESSION_COOKIE = "bloom_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSessionSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET não configurado: defina um segredo forte na Vercel");
  }
  return "bloom-studio-local-development-only-secret";
}

function sign(payload: string): string {
  const hmac = crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

function verify(token: string): string | null {
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  if (!/^[a-f0-9]{64}$/i.test(signature)) return null;
  const expected = crypto.createHmac("sha256", getSessionSecret()).update(payload).digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !crypto.timingSafeEqual(expected, received)) return null;

  const separator = payload.lastIndexOf(":");
  if (separator < 0) return null;
  const userId = payload.slice(0, separator);
  const issuedAt = Number(payload.slice(separator + 1));
  if (!userId || !Number.isFinite(issuedAt) || issuedAt > Date.now() + 60_000 ||
      Date.now() - issuedAt > SESSION_TTL_MS) return null;
  return userId;
}

/**
 * Cria sessão para um usuário (server-side).
 */
export async function createSession(userId: string): Promise<void> {
  const token = sign(`${userId}:${Date.now()}`);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
      password: hashPassword("bloom-demo"),
      role: "USER",
    },
  });
}
