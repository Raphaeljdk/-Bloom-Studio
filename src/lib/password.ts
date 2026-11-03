import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Formato: scrypt$salt-hex$hash-hex (sem dependência externa).
const PREFIX = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return [PREFIX, salt, digest].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  if (stored.startsWith(PREFIX + "$")) {
    const parts = stored.split("$");
    if (parts.length !== 3 || !/^[a-f0-9]{32}$/i.test(parts[1]) ||
        !/^[a-f0-9]{128}$/i.test(parts[2])) return false;
    const expected = Buffer.from(parts[2], "hex");
    const received = scryptSync(password, parts[1], KEY_LENGTH);
    return timingSafeEqual(expected, received);
  }

  // Compatibilidade temporária: contas antigas em texto puro migram ao entrar.
  const legacy = Buffer.from(stored, "utf8");
  const candidate = Buffer.from(password, "utf8");
  return legacy.length === candidate.length && timingSafeEqual(legacy, candidate);
}
