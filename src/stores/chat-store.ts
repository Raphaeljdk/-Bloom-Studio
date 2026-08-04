// ========================================================
// CHAT STORE — Estado do chat com a coautora Flora
// ========================================================

import { create } from "zustand";

export interface ChatSuggestion {
  id: string;
  title: string;
  description: string;
  impact: string | null;
  isApproved: boolean;
  isRejected: boolean;
}

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  suggestion?: ChatSuggestion;
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  isFloraTyping: boolean;
  error: string | null;

  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  appendToLastAssistant: (chunk: string) => void;
  setFloraTyping: (typing: boolean) => void;
  setError: (e: string | null) => void;
  attachSuggestionToMessage: (messageId: string, suggestion: ChatSuggestion) => void;
  resolveSuggestion: (eventId: string, approved: boolean) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isFloraTyping: false,
  error: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  appendToLastAssistant: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "ASSISTANT") {
          msgs[i] = { ...msgs[i], content: msgs[i].content + chunk };
          break;
        }
      }
      return { messages: msgs };
    }),
  setFloraTyping: (typing) => set({ isFloraTyping: typing }),
  setError: (error) => set({ error }),
  attachSuggestionToMessage: (messageId, suggestion) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === messageId ? { ...m, suggestion } : m
      ),
    })),
  resolveSuggestion: (eventId, approved) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.suggestion?.id === eventId
          ? {
              ...m,
              suggestion: {
                ...m.suggestion,
                isApproved: approved,
                isRejected: !approved,
              },
            }
          : m
      ),
    })),
  clear: () => set({ messages: [], error: null, isFloraTyping: false }),
}));
