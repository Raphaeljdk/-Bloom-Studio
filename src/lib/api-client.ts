// ========================================================
// API CLIENT — Wrapper para chamadas fetch com tipagem
// ========================================================

const BASE = "";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(BASE + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Stories
  listStories: () => request<unknown[]>("/api/stories"),
  getStory: (id: string) => request<unknown>(`/api/stories/${id}`),
  createStory: (data: { title: string; description?: string; genre?: string; tone?: string }) =>
    request<unknown>("/api/stories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStory: (id: string, data: Partial<{ title: string; description: string; status: string; genre: string; tone: string }>) =>
    request<unknown>(`/api/stories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteStory: (id: string) =>
    request<void>(`/api/stories/${id}`, { method: "DELETE" }),

  // Characters
  createCharacter: (storyId: string, data: { name: string; description?: string; role?: string; traits?: string }) =>
    request<unknown>(`/api/stories/${storyId}/characters`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCharacter: (storyId: string, charId: string, patch: Record<string, unknown>) =>
    request<unknown>(`/api/stories/${storyId}/characters/${charId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteCharacter: (storyId: string, charId: string) =>
    request<void>(`/api/stories/${storyId}/characters/${charId}`, {
      method: "DELETE",
    }),

  // Chapters
  createChapter: (storyId: string, data: { number: number; title?: string }) =>
    request<unknown>(`/api/stories/${storyId}/chapters`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateChapter: (storyId: string, chapId: string, patch: Record<string, unknown>) =>
    request<unknown>(`/api/stories/${storyId}/chapters/${chapId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteChapter: (storyId: string, chapId: string) =>
    request<void>(`/api/stories/${storyId}/chapters/${chapId}`, {
      method: "DELETE",
    }),

  // Timeline
  createTimelineEvent: (storyId: string, data: { title: string; description?: string; date?: string }) =>
    request<unknown>(`/api/stories/${storyId}/timeline`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTimelineEvent: (storyId: string, evId: string, patch: Record<string, unknown>) =>
    request<unknown>(`/api/stories/${storyId}/timeline/${evId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteTimelineEvent: (storyId: string, evId: string) =>
    request<void>(`/api/stories/${storyId}/timeline/${evId}`, {
      method: "DELETE",
    }),

  // Important Events
  createEvent: (storyId: string, data: { title: string; description: string; impact?: string }) =>
    request<unknown>(`/api/stories/${storyId}/events`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateEvent: (storyId: string, evId: string, patch: Record<string, unknown>) =>
    request<unknown>(`/api/stories/${storyId}/events/${evId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteEvent: (storyId: string, evId: string) =>
    request<void>(`/api/stories/${storyId}/events/${evId}`, {
      method: "DELETE",
    }),

  // Annotations
  createAnnotation: (storyId: string, data: { content: string; category: string }) =>
    request<unknown>(`/api/stories/${storyId}/annotations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteAnnotation: (storyId: string, annId: string) =>
    request<void>(`/api/stories/${storyId}/annotations/${annId}`, {
      method: "DELETE",
    }),

  // Chat
  sendMessage: (storyId: string, content: string) =>
    request<{
      assistantMessageId: string;
      displayContent: string;
      suggestions: Array<{ id: string; title: string; description: string; impact: string | null }>;
    }>(`/api/stories/${storyId}/chat`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  approveSuggestion: (eventId: string) =>
    request<void>(`/api/suggestions/${eventId}/approve`, { method: "POST" }),
  rejectSuggestion: (eventId: string) =>
    request<void>(`/api/suggestions/${eventId}/reject`, { method: "POST" }),

  getChatHistory: (storyId: string) =>
    request<{
      messages: Array<{
        id: string;
        role: string;
        content: string;
        suggestionRef: string | null;
        suggestionType: string | null;
        isApproved: boolean;
        createdAt: string;
        suggestion?: { id: string; title: string; description: string; impact: string | null; isApproved: boolean };
      }>;
    }>(`/api/stories/${storyId}/chat`),

  // Export
  exportMarkdown: (storyId: string) =>
    request<{ markdown: string; filename: string }>(`/api/stories/${storyId}/export`),
};
