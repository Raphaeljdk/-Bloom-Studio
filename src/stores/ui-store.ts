// ========================================================
// UI STORE — Estado global de UI do Bloom Studio
// ========================================================

import { create } from "zustand";

export type AppView = "auth" | "dashboard" | "story";
export type StorySection =
  | "document"
  | "characters"
  | "chapters"
  | "timeline"
  | "events"
  | "annotations"
  | "analytics"
  | "search"
  | "finalize";

interface UIState {
  view: AppView;
  currentStoryId: string | null;
  currentSection: StorySection;
  currentChapterId: string | null;
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  searchQuery: string;
  statusFilter: string;

  setView: (view: AppView) => void;
  openStory: (storyId: string) => void;
  closeStory: () => void;
  setSection: (section: StorySection) => void;
  setCurrentChapter: (chapterId: string | null) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (f: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: "auth",
  currentStoryId: null,
  currentSection: "document",
  currentChapterId: null,
  sidebarCollapsed: false,
  chatOpen: true,
  searchQuery: "",
  statusFilter: "ALL",

  setView: (view) => set({ view }),
  openStory: (storyId) =>
    set({
      view: "story",
      currentStoryId: storyId,
      currentSection: "document",
      currentChapterId: null,
    }),
  closeStory: () =>
    set({
      view: "dashboard",
      currentStoryId: null,
      currentChapterId: null,
    }),
  setSection: (section) => set({ currentSection: section, currentChapterId: null }),
  setCurrentChapter: (chapterId) => set({ currentChapterId: chapterId }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setStatusFilter: (f) => set({ statusFilter: f }),
}));
