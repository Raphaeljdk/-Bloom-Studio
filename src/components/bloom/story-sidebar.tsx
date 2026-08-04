"use client";

import { FileText, Users, BookOpen, Clock, Sparkles, StickyNote, Flower2, BarChart3, Search } from "lucide-react";
import type { StorySection } from "@/stores/ui-store";
import { useStoryStore } from "@/stores/story-store";

interface Props {
  collapsed: boolean;
  currentSection: StorySection;
  onSection: (s: StorySection) => void;
}

export function StorySidebar({ collapsed, currentSection, onSection }: Props) {
  const data = useStoryStore((s) => s.currentStory);
  const counts: Partial<Record<StorySection, number | string>> = {
    document: "",
    characters: data?.characters.length || 0,
    chapters: data?.chapters.length || 0,
    timeline: data?.timeline.length || 0,
    events: data?.events.filter((e) => e.isApproved).length || 0,
    annotations: data?.annotations.length || 0,
    analytics: "",
    search: "",
  };

  const items: Array<{ key: StorySection; label: string; icon: typeof Users }> = [
    { key: "document", label: "Documento", icon: FileText },
    { key: "characters", label: "Personagens", icon: Users },
    { key: "chapters", label: "Capítulos", icon: BookOpen },
    { key: "timeline", label: "Cronologia", icon: Clock },
    { key: "events", label: "Acontecimentos", icon: Sparkles },
    { key: "annotations", label: "Anotações", icon: StickyNote },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "search", label: "Buscar", icon: Search },
  ];

  return (
    <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const active = currentSection === item.key;
        const Icon = item.icon;
        const count = counts[item.key];
        return (
          <button
            key={item.key}
            onClick={() => onSection(item.key)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm ${
              active
                ? "bg-white text-[#B24C63] font-medium flora-shadow-soft"
                : "text-white/90 hover:bg-white/15"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {count !== "" && count !== undefined && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      active ? "bg-[#FADADD] text-[#B24C63]" : "bg-white/20 text-white"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}

      {!collapsed && (
        <div className="pt-4 mt-4 border-t border-white/15 px-3">
          <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
            <Flower2 className="w-3 h-3" />
            Coautora
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🌸</span>
              <span className="font-medium">Flora</span>
            </div>
            <p className="text-xs text-white/70">
              Auxilia com ideias, perguntas e sugestões. Você escreve — ela ajuda a pensar.
            </p>
          </div>
        </div>
      )}
    </nav>
  );
}
