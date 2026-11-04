// ========================================================
// COAUTHOR SERVICE — Bloom Studio
// Orquestra: carrega contexto → monta prompt → chama IA →
//            aplica Suggestion Guard → persiste mensagens
// ========================================================

import { db } from "@/lib/db";
import crypto from "node:crypto";
import { loadStoryContext, serializeContext } from "./context-builder";
import { buildSystemPrompt } from "./prompt-templates";
import { processResponse } from "./suggestion-guard";
import { parseActions } from "./action-parser";
import { ensureFloraProposalStorage } from "@/lib/writing-storage";
import { aiChatCompletion } from "@/lib/ai-client";

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
  proposals: Array<{ id: string; actionType: string; description: string; status: string }>;
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

  // 6. Chama a IA via cliente unificado (z-ai SDK com fallback para fetch)
  const allMessages = [
    { role: "system", content: systemPrompt },
    ...conversationMessages,
  ];

  let rawResponse: string;
  try {
    rawResponse = await aiChatCompletion(allMessages, {
      temperature: 0.8,
      max_tokens: 600,
    });
  } catch (err) {
    console.error("[coauthor] erro ao chamar IA:", err);
    rawResponse = `🌸 Olá! Estou tendo dificuldades técnicas para responder agora.

Isso pode acontecer por:
- **Limite de requisições** excedido no provedor de IA
- **Chave de API** inválida ou expirada

**O que você pode fazer:**
1. Aguarde alguns minutos e tente novamente
2. Se persistir, contate o administrador para verificar as chaves de API

Sua mensagem foi salva e quando eu voltar a funcionar, posso continuar a conversa. 🌷`;
  }

  // 7. Suggestion Guard analisa a resposta
  const guardResult = await processResponse(rawResponse, storyId);

  // 7.5 A Flora só PROPÕE alterações; nenhuma mutação ocorre até aprovação do autor.
  const { actions, cleanContent } = parseActions(guardResult.displayContent || rawResponse);
  const proposedActions = actions
    .filter(action => {
      const data = JSON.stringify(action.data);
      return data.length <= 3500 &&
        Object.values(action.data).every(value => value == null ||
          (typeof value === "string" && value.length <= 2000));
    })
    .slice(0, 5);
  const finalContent = cleanContent ||
    (proposedActions.length > 0
      ? "Preparei sugestões de edição. Revise os cartões abaixo e aprove somente o que desejar."
      : rawResponse);

  // 8. Persiste mensagem do assistente
  const suggestionRef = guardResult.suggestions[0]?.id || null;
  const assistantMessage = await db.chatMessage.create({
    data: {
      sessionId,
      role: "ASSISTANT",
      content: finalContent,
      suggestionRef,
      suggestionType: guardResult.suggestions.length > 0 ? "IMPORTANT_EVENT" : null,
      isApproved: false,
    },
  });

  // As propostas ficam no banco para o autor poder aprovar após atualizar a página.
  let proposals: Array<{ id: string; actionType: string; description: string; status: string }> = [];
  if (proposedActions.length) {
    await ensureFloraProposalStorage();
    const created = await db.$transaction(
      proposedActions.map(action =>
        db.floraProposal.create({
          data: {
            id: crypto.randomUUID(),
            storyId,
            messageId: assistantMessage.id,
            actionType: action.type,
            payload: JSON.stringify(action.data),
            description: action.confirmation.replace(/^✓\s*/, "").replace(/^(adicionado|criado|atualizado)/i, "Proposta:"),
            status: "PENDING",
          },
          select: { id: true, actionType: true, description: true, status: true },
        })
      )
    );
    proposals = created;
  }

  return {
    assistantMessageId: assistantMessage.id,
    displayContent: finalContent || rawResponse,
    suggestions: guardResult.suggestions,
    proposals,
    rawResponse,
  };
}

/**
 * Aprova uma sugestão de evento: marca como aprovada + marca a
 * mensagem do chat como aprovada. Usa transação Prisma para garantir atomicidade.
 */
export async function approveSuggestion(eventId: string, userId: string): Promise<void> {
  const event = await db.importantEvent.findFirst({
    where: { id: eventId, suggestedBy: "COAUTHOR", story: { userId } },
    select: { id: true },
  });
  if (!event) throw new Error("NOT_FOUND");
  await db.$transaction([
    db.importantEvent.updateMany({
      where: { id: eventId, story: { userId }, suggestedBy: "COAUTHOR" },
      data: { isApproved: true },
    }),
    db.chatMessage.updateMany({
      where: { suggestionRef: eventId, session: { story: { userId } } },
      data: { isApproved: true },
    }),
  ]);
}

/**
 * Recusa uma sugestão: deleta o evento pendente + remove referência da mensagem.
 */
export async function rejectSuggestion(eventId: string, userId: string): Promise<void> {
  const event = await db.importantEvent.findFirst({
    where: { id: eventId, isApproved: false, suggestedBy: "COAUTHOR", story: { userId } },
    select: { id: true },
  });
  if (!event) throw new Error("NOT_FOUND");
  await db.$transaction([
    db.chatMessage.updateMany({
      where: { suggestionRef: eventId, session: { story: { userId } } },
      data: { suggestionRef: null, suggestionType: null },
    }),
    db.importantEvent.deleteMany({
      where: { id: eventId, isApproved: false, story: { userId }, suggestedBy: "COAUTHOR" },
    }),
  ]);
}
