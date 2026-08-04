"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, BookOpen, Clock, Sparkles, StickyNote,
  Download, ChevronLeft, ChevronRight, Flower2, FileText
} from "lucide-react";
import { useUIStore, type StorySection } from "@/stores/ui-store";
import { useStoryDetail } from "@/hooks/use-stories";
import { useStoryStore } from "@/stores/story-store";
import { StorySidebar } from "./story-sidebar";
import { CharactersPanel } from "./panels/characters-panel";
import { ChaptersPanel } from "./panels/chapters-panel";
import { TimelinePanel } from "./panels/timeline-panel";
import { ImportantEventsPanel } from "./panels/events-panel";
import { AnnotationsPanel } from "./panels/annotations-panel";
import { CoauthorChat } from "./coauthor-chat";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface StoryMeta {
  id: string;
  title: string;
  description: string | null;
  status: string;
  colorTheme: string;
  genre: string | null;
  tone: string | null;
}

const SECTION_INFO: Record<StorySection, { label: string; icon: typeof Users; description: string }> = {
  characters: { label: "Personagens", icon: Users, description: "Quem habita sua história" },
  chapters: { label: "Capítulos", icon: BookOpen, description: "A estrutura narrativa" },
  timeline: { label: "Cronologia", icon: Clock, description: "A ordem dos acontecimentos" },
  events: { label: "Acontecimentos", icon: Sparkles, description: "Eventos importantes aprovados" },
  annotations: { label: "Anotações", icon: StickyNote, description: "Ideias, perguntas e decisões" },
};

export function StoryEditor() {
  const storyId = useUIStore((s) => s.currentStoryId);
  const currentSection = useUIStore((s) => s.currentSection);
  const setSection = useUIStore((s) => s.setSection);
  const closeStory = useUIStore((s) => s.closeStory);
  const chatOpen = useUIStore((s) => s.chatOpen);
  const toggleChat = useUIStore((s) => s.toggleChat);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const { data: story, isLoading } = useStoryDetail(storyId);
  const [meta, setMeta] = useState<StoryMeta | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (story) {
      setMeta({
        id: story.id,
        title: story.title,
        description: story.description,
        status: story.status,
        colorTheme: story.colorTheme,
        genre: story.genre,
        tone: story.tone,
      });
    }
  }, [story]);

  const handleExport = async () => {
    if (!storyId) return;
    setExporting(true);
    try {
      const data = await api.exportMarkdown(storyId);
      const blob = new Blob([data.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("História exportada como Markdown 🌸");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  if (!storyId) return null;

  if (isLoading || !meta) {
    return (
      <div className="min-h-screen flora-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl flora-petal-float mb-4">🌸</div>
          <p className="flora-text-secondary text-sm">Abrindo história...</p>
        </div>
      </div>
    );
  }

  const section = SECTION_INFO[currentSection];
  const SectionIcon = section.icon;

  return (
    <div className="h-screen flex flex-col flora-bg-primary overflow-hidden">
      {/* Top header */}
      <header className="flex-shrink-0 h-14 bg-[#C48D9E] text-white flex items-center px-4 gap-3 border-b border-white/10">
        <Button
          onClick={closeStory}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <div className="h-6 w-px bg-white/30" />
        <Flower2 className="w-5 h-5" />
        <h1 className="font-semibold truncate flex-1">{meta.title}</h1>
        {meta.genre && (
          <span className="hidden md:inline text-xs px-2 py-1 rounded-full bg-white/15">
            {meta.genre}
          </span>
        )}
        <Button
          onClick={handleExport}
          variant="ghost"
          size="sm"
          disabled={exporting}
          className="text-white hover:bg-white/15"
        >
          <Download className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">{exporting ? "Exportando..." : "Exportar"}</span>
        </Button>
        <Button
          onClick={toggleChat}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15"
        >
          {chatOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </header>

      {/* 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Coluna 1 — Sidebar */}
        <aside
          className={`flex-shrink-0 transition-all duration-300 ${
            sidebarCollapsed ? "w-16" : "w-60"
          } bg-[#C48D9E] text-white flex flex-col`}
        >
          <div className="p-3 flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-xs uppercase tracking-wider text-white/70">Seções</span>
            )}
            <Button
              onClick={toggleSidebar}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15 h-8 w-8 p-0"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
          <StorySidebar
            collapsed={sidebarCollapsed}
            currentSection={currentSection}
            onSection={setSection}
          />
        </aside>

        {/* Coluna 2 — Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-shrink-0 px-6 py-4 border-b border-[#E6C2C7] bg-white/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flora-gradient-accent flex items-center justify-center">
                <SectionIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold flora-text-primary">{section.label}</h2>
                <p className="text-xs flora-text-secondary">{section.description}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {currentSection === "characters" && <CharactersPanel storyId={storyId} />}
            {currentSection === "chapters" && <ChaptersPanel storyId={storyId} />}
            {currentSection === "timeline" && <TimelinePanel storyId={storyId} />}
            {currentSection === "events" && <ImportantEventsPanel storyId={storyId} />}
            {currentSection === "annotations" && <AnnotationsPanel storyId={storyId} />}
          </div>
        </main>

        {/* Coluna 3 — Coauthor chat */}
        {chatOpen && (
          <motion.aside
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            className="w-full sm:w-96 flex-shrink-0 border-l border-[#E6C2C7] bg-white flex flex-col"
          >
            <CoauthorChat storyId={storyId} />
          </motion.aside>
        )}
      </div>
    </div>
  );
}
