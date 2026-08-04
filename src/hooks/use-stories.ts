"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useStoryStore, type StorySummary } from "@/stores/story-store";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";

/**
 * Hook principal de histórias: carrega lista, cria, atualiza, deleta.
 * Mantém cache sincronizado com o store Zustand.
 */
export function useStories() {
  const qc = useQueryClient();
  const setStories = useStoryStore((s) => s.setStories);
  const upsertStory = useStoryStore((s) => s.upsertStory);
  const removeStory = useStoryStore((s) => s.removeStory);
  const statusFilter = useUIStore((s) => s.statusFilter);
  const searchQuery = useUIStore((s) => s.searchQuery);

  const query = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const data = (await api.listStories()) as StorySummary[];
      setStories(data);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; genre?: string; tone?: string }) =>
      api.createStory(data) as Promise<StorySummary>,
    onSuccess: (story) => {
      upsertStory(story);
      qc.invalidateQueries({ queryKey: ["stories"] });
      toast.success(`História "${story.title}" criada 🌸`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ title: string; description: string; status: string; genre: string; tone: string }> }) =>
      api.updateStory(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStory(id),
    onSuccess: (_data, id) => {
      removeStory(id);
      toast.success("História removida");
    },
  });

  const filtered = (query.data || []).filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return {
    stories: filtered,
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}

/**
 * Hook para carregar todos os dados de uma história específica.
 */
export function useStoryDetail(storyId: string | null) {
  const setCurrentStoryData = useStoryStore((s) => s.setCurrentStoryData);

  const query = useQuery({
    queryKey: ["story", storyId],
    queryFn: async () => {
      const data = await api.getStory(storyId!);
      const story = data as {
        id: string;
        title: string;
        description: string | null;
        status: string;
        colorTheme: string;
        genre: string | null;
        tone: string | null;
        characters: never[];
        chapters: never[];
        timeline: never[];
        events: never[];
        annotations: never[];
      };
      setCurrentStoryData({
        characters: story.characters,
        chapters: story.chapters,
        timeline: story.timeline,
        events: story.events,
        annotations: story.annotations,
      });
      return story;
    },
    enabled: !!storyId,
  });

  return query;
}
