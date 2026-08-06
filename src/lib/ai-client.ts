// ========================================================
// AI CLIENT — Wrapper unificado para z-ai-web-dev-sdk
// Funciona em dev (sandbox) e produção (Vercel)
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
 * Necessário na Vercel onde o arquivo não existe no filesystem.
 */
async function ensureConfig(): Promise<void> {
  // Se já existe, não faz nada
  if (await configExists()) return;

  // Constrói config a partir de env vars
  const baseUrl = process.env.Z_AI_BASE_URL || "https://internal-api.z.ai/v1";
  const apiKey = process.env.Z_AI_API_KEY || "Z.ai";
  const chatId = process.env.Z_AI_CHAT_ID || "";
  const userId = process.env.Z_AI_USER_ID || "";
  const token = process.env.Z_AI_TOKEN || "";

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Config Z-AI não encontrada. Defina Z_AI_BASE_URL e Z_AI_API_KEY nas variáveis de ambiente."
    );
  }

  const config: Record<string, string> = { baseUrl, apiKey };
  if (chatId) config.chatId = chatId;
  if (userId) config.userId = userId;
  if (token) config.token = token;

  // Tenta escrever em vários locais (pelo menos um deve ser gravável)
  const targets = [
    path.join(os.homedir(), ".z-ai-config"),
    path.join(process.cwd(), ".z-ai-config"),
    "/tmp/.z-ai-config",
  ];

  for (const target of targets) {
    try {
      await fs.writeFile(target, JSON.stringify(config), "utf-8");
      console.log(`[ai-client] Config escrito em: ${target}`);
      return;
    } catch {
      // tenta próximo
    }
  }

  throw new Error("Não foi possível escrever o arquivo .z-ai-config em nenhum local.");
}

/**
 * Cria uma instância do ZAI client.
 * Garante que o config existe antes de criar.
 */
export async function createAIClient() {
  await ensureConfig();
  return ZAI.create();
}

/**
 * Fallback: chamada direta via fetch para API OpenAI-compatible.
 * Usada se o z-ai SDK falhar (ex: API interna inacessível na Vercel).
 */
export async function chatCompletionViaFetch(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const baseUrl = process.env.OPENAI_API_BASE_URL || process.env.Z_AI_BASE_URL || "https://internal-api.z.ai/v1";
  const apiKey = process.env.OPENAI_API_KEY || process.env.Z_AI_API_KEY || "Z.ai";

  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // Adiciona headers opcionais do z-ai
  if (process.env.Z_AI_TOKEN) {
    headers["X-Token"] = process.env.Z_AI_TOKEN;
  }
  if (process.env.Z_AI_USER_ID) {
    headers["X-User-Id"] = process.env.Z_AI_USER_ID;
  }

  const body = {
    messages,
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.max_tokens ?? 800,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Função unificada: tenta z-ai SDK primeiro, faz fallback para fetch.
 */
export async function aiChatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  // Tenta z-ai SDK primeiro
  try {
    const zai = await createAIClient();
    const completion = await zai.chat.completions.create({
      messages,
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.max_tokens ?? 800,
    } as Record<string, unknown>);
    const content = completion.choices?.[0]?.message?.content;
    if (content) return content;
    throw new Error("Resposta vazia do z-ai SDK");
  } catch (zaiError) {
    console.warn("[ai-client] z-ai SDK falhou, tentando fetch direto:", zaiError instanceof Error ? zaiError.message : zaiError);
    // Fallback para fetch direto
    return chatCompletionViaFetch(messages, options);
  }
}
