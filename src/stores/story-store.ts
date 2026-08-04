// ========================================================
// STORY STORE — Cache client-side de histórias e entidades
// ========================================================

import { create } from "zustand";

export interface StorySummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  colorTheme: string;
  genre: string | null;
  tone: string | null;
  coverUrl: string | null;
  coverStyle: string | null;
  chaptersCount: number;
  charactersCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface Character {
  id: string;
  name: string;
  description: string | null;
  role: string | null;
  traits: string | null;
}

export interface Chapter {
  id: string;
  number: number;
  title: string | null;
  summary: string | null;
  content: string | null;
  status: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  order: number;
  date: string | null;
}

export interface ImportantEvent {
  id: string;
  title: string;
  description: string;
  impact: string | null;
  isApproved: boolean;
  suggestedBy: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  content: string;
  category: string;
  createdAt: string;
}

interface StoryState {
  stories: StorySummary[];
  currentStory: {
    characters: Character[];
    chapters: Chapter[];
    timeline: TimelineEvent[];
    events: ImportantEvent[];
    annotations: Annotation[];
  } | null;

  setStories: (s: StorySummary[]) => void;
  upsertStory: (s: StorySummary) => void;
  removeStory: (id: string) => void;
  setCurrentStoryData: (data: StoryState["currentStory"]) => void;

  // Characters
  setCharacters: (c: Character[]) => void;
  addCharacter: (c: Character) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  removeCharacter: (id: string) => void;

  // Chapters
  setChapters: (c: Chapter[]) => void;
  addChapter: (c: Chapter) => void;
  updateChapter: (id: string, patch: Partial<Chapter>) => void;
  removeChapter: (id: string) => void;

  // Timeline
  setTimeline: (t: TimelineEvent[]) => void;
  addTimelineEvent: (t: TimelineEvent) => void;
  updateTimelineEvent: (id: string, patch: Partial<TimelineEvent>) => void;
  removeTimelineEvent: (id: string) => void;

  // Events
  setEvents: (e: ImportantEvent[]) => void;
  addEvent: (e: ImportantEvent) => void;
  updateEvent: (id: string, patch: Partial<ImportantEvent>) => void;
  removeEvent: (id: string) => void;

  // Annotations
  setAnnotations: (a: Annotation[]) => void;
  addAnnotation: (a: Annotation) => void;
  removeAnnotation: (id: string) => void;

  reset: () => void;
}

export const useStoryStore = create<StoryState>((set) => ({
  stories: [],
  currentStory: null,

  setStories: (stories) => set({ stories }),
  upsertStory: (s) =>
    set((state) => {
      const idx = state.stories.findIndex((x) => x.id === s.id);
      if (idx === -1) return { stories: [s, ...state.stories] };
      const updated = [...state.stories];
      updated[idx] = s;
      return { stories: updated };
    }),
  removeStory: (id) =>
    set((state) => ({ stories: state.stories.filter((s) => s.id !== id) })),

  setCurrentStoryData: (data) => set({ currentStory: data }),
  setCharacters: (characters) =>
    set((s) => ({ currentStory: s.currentStory ? { ...s.currentStory, characters } : null })),
  addCharacter: (c) =>
    set((s) => ({
      currentStory: s.currentStory
        ? { ...s.currentStory, characters: [...s.currentStory.characters, c] }
        : null,
    })),
  updateCharacter: (id, patch) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            characters: s.currentStory.characters.map((c) =>
              c.id === id ? { ...c, ...patch } : c
            ),
          }
        : null,
    })),
  removeCharacter: (id) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            characters: s.currentStory.characters.filter((c) => c.id !== id),
          }
        : null,
    })),

  setChapters: (chapters) =>
    set((s) => ({ currentStory: s.currentStory ? { ...s.currentStory, chapters } : null })),
  addChapter: (c) =>
    set((s) => ({
      currentStory: s.currentStory
        ? { ...s.currentStory, chapters: [...s.currentStory.chapters, c] }
        : null,
    })),
  updateChapter: (id, patch) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            chapters: s.currentStory.chapters.map((c) =>
              c.id === id ? { ...c, ...patch } : c
            ),
          }
        : null,
    })),
  removeChapter: (id) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            chapters: s.currentStory.chapters.filter((c) => c.id !== id),
          }
        : null,
    })),

  setTimeline: (timeline) =>
    set((s) => ({ currentStory: s.currentStory ? { ...s.currentStory, timeline } : null })),
  addTimelineEvent: (t) =>
    set((s) => ({
      currentStory: s.currentStory
        ? { ...s.currentStory, timeline: [...s.currentStory.timeline, t] }
        : null,
    })),
  updateTimelineEvent: (id, patch) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            timeline: s.currentStory.timeline.map((t) =>
              t.id === id ? { ...t, ...patch } : t
            ),
          }
        : null,
    })),
  removeTimelineEvent: (id) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            timeline: s.currentStory.timeline.filter((t) => t.id !== id),
          }
        : null,
    })),

  setEvents: (events) =>
    set((s) => ({ currentStory: s.currentStory ? { ...s.currentStory, events } : null })),
  addEvent: (e) =>
    set((s) => ({
      currentStory: s.currentStory
        ? { ...s.currentStory, events: [e, ...s.currentStory.events] }
        : null,
    })),
  updateEvent: (id, patch) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            events: s.currentStory.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          }
        : null,
    })),
  removeEvent: (id) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            events: s.currentStory.events.filter((e) => e.id !== id),
          }
        : null,
    })),

  setAnnotations: (annotations) =>
    set((s) => ({ currentStory: s.currentStory ? { ...s.currentStory, annotations } : null })),
  addAnnotation: (a) =>
    set((s) => ({
      currentStory: s.currentStory
        ? { ...s.currentStory, annotations: [a, ...s.currentStory.annotations] }
        : null,
    })),
  removeAnnotation: (id) =>
    set((s) => ({
      currentStory: s.currentStory
        ? {
            ...s.currentStory,
            annotations: s.currentStory.annotations.filter((a) => a.id !== id),
          }
        : null,
    })),

  reset: () => set({ stories: [], currentStory: null }),
}));
