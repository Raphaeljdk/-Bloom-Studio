// ========================================================
// COAUTHOR SERVICE — Bloom Studio
// Orquestra: carrega contexto → monta prompt → chama IA →
//            aplica Suggestion Guard → persiste mensagens
// ========================================================

import { db } from "@/lib/db";
import { loadStoryContext, serializeContext } from "./context-builder";
import { buildSystemPrompt } from "./prompt-templates";
import { processResponse } from "./suggestion-guard";
import ZAI from "z-ai-web-dev-sdk";

/**
 * Garante que exista uma ChatSession ativa para a história.
 */
async function ensureSession(storyId: string): Promise<string> {
  const existing = await db.chatSession.findFirst({
    where: { storyId },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing.id;

  const session = await db.chatSession.create({
    data: { storyId, title: "Conversa com Flora" },
  });
  return session.id;
}

/**
 * Envia uma mensagem do usuário para a Flora e retorna a resposta
 * processada (com sugestões extraídas e persistidas).
 *
 * Retorna o ID da mensagem do assistente + conteúdo de exibição +
 * lista de sugestões geradas (já persistidas no banco).
 */
export async function sendToFlora(params: {
  storyId: string;
  userMessage: string;
}): Promise<{
  assistantMessageId: string;
  displayContent: string;
  suggestions: Array<{ id: string; title: string; description: string; impact: string | null }>;
  rawResponse: string;
}> {
  const { storyId, userMessage } = params;

  // 1. Garante sessão
  const sessionId = await ensureSession(storyId);

  // 2. Persiste mensagem do usuário
  await db.chatMessage.create({
    data: { sessionId, role: "USER", content: userMessage },
  });

  // 3. Carrega contexto COMPLETO (inclui últimas 20 mensagens)
  const ctx = await loadStoryContext(storyId);
  if (!ctx) throw new Error("História não encontrada");

  // 4. Monta system prompt com contexto serializado
  const serialized = serializeContext(ctx);
  const systemPrompt = buildSystemPrompt(serialized);

  // 5. Histórico de conversa para a IA
  const conversationMessages = [
    ...ctx.recentMessages.map((m) => ({
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  // 6. Chama a IA via z-ai-web-dev-sdk
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
    ],
    temperature: 0.85,
    max_tokens: 1200,
  });

  const rawResponse: string =
    completion.choices?.[0]?.message?.content ??
    "🌸 Desculpe, não consegui formular uma resposta agora. Pode repetir?";

  // 7. Suggestion Guard analisa a resposta
  const guardResult = await processResponse(rawResponse, storyId);

  // 8. Persiste mensagem do assistente (displayContent + referência às sugestões)
  const suggestionRef = guardResult.suggestions[0]?.id || null;
  const assistantMessage = await db.chatMessage.create({
    data: {
      sessionId,
      role: "ASSISTANT",
      content: guardResult.displayContent || rawResponse,
      suggestionRef,
      suggestionType: guardResult.suggestions.length > 0 ? "IMPORTANT_EVENT" : null,
      isApproved: false,
    },
  });

  return {
    assistantMessageId: assistantMessage.id,
    displayContent: guardResult.displayContent || rawResponse,
    suggestions: guardResult.suggestions,
    rawResponse,
  };
}

/**
 * Aprova uma sugestão de evento: marca como aprovada + marca a
 * mensagem do chat como aprovada. Usa transação Prisma para garantir atomicidade.
 */
export async function approveSuggestion(eventId: string): Promise<void> {
  await db.$transaction([
    db.importantEvent.update({
      where: { id: eventId },
      data: { isApproved: true },
    }),
    db.chatMessage.updateMany({
      where: { suggestionRef: eventId },
      data: { isApproved: true },
    }),
  ]);
}

/**
 * Recusa uma sugestão: deleta o evento pendente + remove referência da mensagem.
 */
export async function rejectSuggestion(eventId: string): Promise<void> {
  await db.$transaction([
    db.importantEvent.delete({ where: { id: eventId } }),
    db.chatMessage.updateMany({
      where: { suggestionRef: eventId },
      data: { suggestionRef: null, suggestionType: null },
    }),
  ]);
}
