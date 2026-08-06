// ========================================================
// AI CLIENT — Wrapper unificado para múltiplos provedores
// Suporta: z-ai-web-dev-sdk (dev) e Groq (produção/Vercel)
// ========================================================

import ZAI from "z-ai-web-dev-sdk";
import fs from "fs/promises";
import path from "path";
import os from "os";

const CONFIG_PATHS = [
  path.join(process.cwd(), ".z-ai-config"),
  path.join(os.homedir(), ".z-ai-config"),
  "/etc/.z-ai-config",
];

/**
 * Verifica se o arquivo de config do z-ai já existe.
 */
async function configExists(): Promise<boolean> {
  for (const p of CONFIG_PATHS) {
    try {
      await fs.access(p);
      return true;
    } catch {
      // não existe
    }
  }
  return false;
}

/**
 * Escreve o config do z-ai a partir de variáveis de ambiente.
 */
async function ensureConfig(): Promise<void> {
  if (await configExists()) return;

  const baseUrl = process.env.Z_AI_BASE_URL || "https://internal-api.z.ai/v1";
  const apiKey = process.env.Z_AI_API_KEY || "Z.ai";
  const chatId = process.env.Z_AI_CHAT_ID || "";
  const userId = process.env.Z_AI_USER_ID || "";
  const token = process.env.Z_AI_TOKEN || "";

  if (!baseUrl || !apiKey) return; // não pode escrever config sem dados

  const config: Record<string, string> = { baseUrl, apiKey };
  if (chatId) config.chatId = chatId;
  if (userId) config.userId = userId;
  if (token) config.token = token;

  const targets = [
    path.join(os.homedir(), ".z-ai-config"),
    path.join(process.cwd(), ".z-ai-config"),
    "/tmp/.z-ai-config",
  ];

  for (const target of targets) {
    try {
      await fs.writeFile(target, JSON.stringify(config), "utf-8");
      return;
    } catch {
      // tenta próximo
    }
  }
}

/**
 * Cria uma instância do ZAI client.
 */
export async function createAIClient() {
  await ensureConfig();
  return ZAI.create();
}

// ========================================================
// GROQ — OpenAI-compatible API (rápido e gratuito)
// ========================================================

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

/**
 * Chamada direta via Groq API (OpenAI-compatible).
 * Usa GROQ_API_KEY do ambiente.
 */
export async function chatCompletionViaGroq(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada");
  }

  const model = process.env.GROQ_MODEL || GROQ_MODELS[0];
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.max_tokens ?? 800,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Chamada via z-ai SDK (sandbox/dev).
 */
async function chatCompletionViaZAI(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const zai = await createAIClient();
  const completion = await zai.chat.completions.create({
    messages,
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.max_tokens ?? 800,
  } as Record<string, unknown>);
  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error("Resposta vazia do z-ai SDK");
  return content;
}

/**
 * Função unificada: usa Groq se GROQ_API_KEY existir, senão z-ai SDK.
 * Na Vercel, GROQ_API_KEY deve estar configurada.
 * No sandbox, z-ai SDK funciona nativamente.
 */
export async function aiChatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  // Prioridade 1: Groq (se configurado)
  if (process.env.GROQ_API_KEY) {
    try {
      return await chatCompletionViaGroq(messages, options);
    } catch (err) {
      console.warn("[ai-client] Groq falhou:", err instanceof Error ? err.message : err);
      // cai para z-ai
    }
  }

  // Prioridade 2: z-ai SDK (sandbox/dev)
  try {
    return await chatCompletionViaZAI(messages, options);
  } catch (err) {
    console.warn("[ai-client] z-ai SDK falhou:", err instanceof Error ? err.message : err);
    throw err;
  }
}
