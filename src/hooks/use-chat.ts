"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useChatStore, type ChatMessage } from "@/stores/chat-store";
import { useStoryStore } from "@/stores/story-store";
import { toast } from "sonner";

/**
 * Hook para gerenciar o chat com a Flora.
 * - Carrega histórico
 * - Envia mensagens (com indicador de "digitando")
 * - Aprova/recusa sugestões de eventos
 */
export function useChat(storyId: string | null) {
  const qc = useQueryClient();
  const { messages, setMessages, addMessage, setFloraTyping, attachSuggestionToMessage, resolveSuggestion } = useChatStore();
  const addEvent = useStoryStore((s) => s.addEvent);
  const removeEvent = useStoryStore((s) => s.removeEvent);

  // Histórico
  const historyQuery = useQuery({
    queryKey: ["chat", storyId],
    queryFn: async () => {
      const data = await api.getChatHistory(storyId!);
      const msgs: ChatMessage[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role as "USER" | "ASSISTANT" | "SYSTEM",
        content: m.content,
        createdAt: m.createdAt,
        suggestion: m.suggestion
          ? {
              id: m.suggestion.id,
              title: m.suggestion.title,
              description: m.suggestion.description,
              impact: m.suggestion.impact,
              isApproved: m.suggestion.isApproved,
              isRejected: false,
            }
          : undefined,
      }));
      setMessages(msgs);
      return msgs;
    },
    enabled: !!storyId,
  });

  // Enviar mensagem
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      setFloraTyping(true);
      try {
        return await api.sendMessage(storyId!, content);
      } finally {
        setFloraTyping(false);
      }
    },
    onMutate: (content) => {
      // Optimistic: adiciona mensagem do usuário imediatamente
      addMessage({
        id: `temp-${Date.now()}`,
        role: "USER",
        content,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: (result) => {
      addMessage({
        id: result.assistantMessageId,
        role: "ASSISTANT",
        content: result.displayContent,
        createdAt: new Date().toISOString(),
      });
      // Se houver sugestões, anexa à última mensagem do assistente
      if (result.suggestions.length > 0) {
        const sug = result.suggestions[0];
        attachSuggestionToMessage(result.assistantMessageId, {
          id: sug.id,
          title: sug.title,
          description: sug.description,
          impact: sug.impact,
          isApproved: false,
          isRejected: false,
        });
      }
      // Invalida important events para atualizar painel
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
    onError: (e: Error) => {
      toast.error(`Flora não pôde responder: ${e.message}`);
    },
  });

  // Aprovar sugestão
  const approveMutation = useMutation({
    mutationFn: (eventId: string) => api.approveSuggestion(eventId),
    onSuccess: (_data, eventId) => {
      resolveSuggestion(eventId, true);
      // Atualiza o evento no store local (pendentes → aprovado)
      const events = useStoryStore.getState().currentStory?.events || [];
      const ev = events.find((e) => e.id === eventId);
      if (ev) {
        removeEvent(eventId);
        addEvent({ ...ev, isApproved: true });
      }
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      toast.success("Evento aprovado e adicionado à história 🌷");
    },
  });

  // Recusar sugestão
  const rejectMutation = useMutation({
    mutationFn: (eventId: string) => api.rejectSuggestion(eventId),
    onSuccess: (_data, eventId) => {
      resolveSuggestion(eventId, false);
      removeEvent(eventId);
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      toast.info("Sugestão recusada. Flora pode propor outra abordagem.");
    },
  });

  return {
    messages,
    isLoading: historyQuery.isLoading,
    isFloraTyping: useChatStore((s) => s.isFloraTyping),
    send: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    approveSuggestion: approveMutation.mutateAsync,
    rejectSuggestion: rejectMutation.mutateAsync,
  };
}
