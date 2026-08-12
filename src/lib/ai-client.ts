// ========================================================
// AI CLIENT — Wrapper unificado para múltiplos provedores
// Prioridade: Gemini (Google) > Groq > z-ai SDK (dev)
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

async function ensureConfig(): Promise<void> {
  if (await configExists()) return;

  const baseUrl = process.env.Z_AI_BASE_URL || "https://internal-api.z.ai/v1";
  const apiKey = process.env.Z_AI_API_KEY || "Z.ai";
  const chatId = process.env.Z_AI_CHAT_ID || "";
  const userId = process.env.Z_AI_USER_ID || "";
  const token = process.env.Z_AI_TOKEN || "";

  if (!baseUrl || !apiKey) return;

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

export async function createAIClient() {
  await ensureConfig();
  return ZAI.create();
}

// ========================================================
// GEMINI (Google AI) — Provedor principal
// ========================================================

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

/**
 * Mapeia mensagens OpenAI-style para o formato do Gemini.
 * Gemini usa "user" e "model" (não "assistant").
 * "system" vai para systemInstruction separadamente.
 */
function mapMessagesForGemini(
  messages: Array<{ role: string; content: string }>
): { systemInstruction?: string; contents: Array<{ role: string; parts: Array<{ text: string }> }> } {
  let systemInstruction: string | undefined;
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      // Acumula system messages
      systemInstruction = systemInstruction
        ? systemInstruction + "\n\n" + msg.content
        : msg.content;
    } else {
      // Mapeia roles: assistant → model, user → user
      const role = msg.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text: msg.content }] });
    }
  }

  // Gemini requer alternância user/model. Se houver duas mensagens user seguidas, junta.
  const merged: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const c of contents) {
    const last = merged[merged.length - 1];
    if (last && last.role === c.role) {
      last.parts[0].text += "\n\n" + c.parts[0].text;
    } else {
      merged.push({ ...c });
    }
  }

  // Gemini precisa que comece com user
  if (merged.length > 0 && merged[0].role !== "user") {
    merged.unshift({ role: "user", parts: [{ text: "(continuação)" }] });
  }

  return {
    systemInstruction: systemInstruction ? JSON.stringify({ parts: [{ text: systemInstruction }] }) : undefined,
    contents: merged,
  };
}

/**
 * Chamada via Gemini API (Google AI).
 * Usa GEMINI_API_KEY do ambiente.
 */
export async function chatCompletionViaGemini(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number; model?: string }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada");
  }

  const model = options?.model || process.env.GEMINI_MODEL || GEMINI_MODELS[0];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const { systemInstruction, contents } = mapMessagesForGemini(messages);

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.8,
      maxOutputTokens: options?.max_tokens ?? 800,
      topP: 0.95,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  if (systemInstruction) {
    body.systemInstruction = JSON.parse(systemInstruction);
  }

  const maxRetries = 2;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Timeout de 10s — Gemini com quota esgotada deve falhar rápido
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        // Rate limit — verifica se é quota esgotada (limit: 0)
        const errorBody = await response.text();
        const isQuotaExhausted = errorBody.includes("limit: 0") || errorBody.includes("RESOURCE_EXHAUSTED");

        if (isQuotaExhausted) {
          // Quota zerada — não adianta tentar de novo, falha imediatamente
          console.warn("[gemini] Quota esgotada (limit: 0). Pulando para próximo provedor...");
          throw new Error("Gemini quota exhausted (limit: 0)");
        }

        // Rate limit temporário — tenta novamente com backoff
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelay * Math.pow(2, attempt);
        console.warn(`[gemini] Rate limit (429). Tentativa ${attempt + 1}/${maxRetries}. Aguardando ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (response.status === 404 || response.status === 400) {
        // Modelo inválido — tenta fallback
        const errorText = await response.text();
        const fallbackModel = GEMINI_MODELS.find((m) => m !== model);
        if (fallbackModel) {
          console.warn(`[gemini] Modelo ${model} falhou (${response.status}), tentando ${fallbackModel}...`);
          return chatCompletionViaGemini(messages, { ...options, model: fallbackModel });
        }
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      if (response.status >= 500) {
        console.warn(`[gemini] Erro ${response.status}. Tentativa ${attempt + 1}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Verifica se foi bloqueado por safety
      if (data.promptFeedback?.blockReason) {
        return "🌸 Não posso responder a esse conteúdo. Pode reformular?";
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        // Pode ter sido bloqueado
        const finishReason = data.candidates?.[0]?.finishReason;
        if (finishReason === "SAFETY") {
          return "🌸 Essa resposta foi filtrada por segurança. Pode tentar de outra forma?";
        }
        throw new Error("Resposta vazia do Gemini");
      }

      return content;
    } catch (err) {
      // Erro de rede — tenta novamente
      if (attempt < maxRetries - 1) {
        const isNetworkError = err instanceof TypeError || (err instanceof Error && err.message.includes("fetch"));
        if (isNetworkError) {
          console.warn(`[gemini] Erro de rede. Tentativa ${attempt + 1}/${maxRetries}:`, err instanceof Error ? err.message : err);
          await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
          continue;
        }
      }
      throw err;
    }
  }

  throw new Error("Gemini: máximo de tentativas excedido");
}

// ========================================================
// GROQ — Fallback 1
// ========================================================

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chatCompletionViaGroq(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number; model?: string }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY não configurada");

  const model = options?.model || process.env.GROQ_MODEL || GROQ_MODELS[0];
  const url = "https://api.groq.com/openai/v1/chat/completions";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Timeout de 15s por tentativa — evita travar a função serverless
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
          max_tokens: options?.max_tokens ?? 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`[groq] Rate limit. Tentativa ${attempt + 1}/3. Aguardando ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      if (response.status >= 500) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }

      if (response.status === 404 || response.status === 400) {
        const fallback = GROQ_MODELS.find((m) => m !== model);
        if (fallback) return chatCompletionViaGroq(messages, { ...options, model: fallback });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      if (attempt < 2) {
        await sleep(2000 * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Groq: máximo de tentativas excedido");
}

// ========================================================
// z-ai SDK (sandbox/dev)
// ========================================================

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

// ========================================================
// FUNÇÃO UNIFICADA — Prioridade: Gemini > Groq > z-ai
// ========================================================

export async function aiChatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const errors: string[] = [];

  // 1. Gemini (prioridade principal)
  if (process.env.GEMINI_API_KEY) {
    try {
      return await chatCompletionViaGemini(messages, options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Gemini: ${msg}`);
      console.warn("[ai-client] Gemini falhou:", msg);
    }
  }

  // 2. Groq (fallback 1)
  if (process.env.GROQ_API_KEY) {
    try {
      return await chatCompletionViaGroq(messages, options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Groq: ${msg}`);
      console.warn("[ai-client] Groq falhou:", msg);
    }
  }

  // 3. z-ai SDK (sandbox/dev)
  try {
    return await chatCompletionViaZAI(messages, options);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`z-ai: ${msg}`);
  }

  throw new Error(`Todos os provedores falharam: ${errors.join(" | ")}`);
}
