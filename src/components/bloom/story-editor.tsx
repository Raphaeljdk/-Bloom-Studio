"use client";

import { useEffect, useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, BookOpen, Clock, Sparkles, StickyNote,
  ChevronLeft, ChevronRight, Flower2, FileText,
  Settings, Check, X, Pencil, Sparkle, BarChart3, Search, Target, Menu
} from "lucide-react";
import { useUIStore, type StorySection } from "@/stores/ui-store";
import { useStoryDetail } from "@/hooks/use-stories";
import { StorySidebar } from "./story-sidebar";
import { DocumentPanel } from "./panels/document-panel";
import { CharactersPanel } from "./panels/characters-panel";
import { ChaptersPanel } from "./panels/chapters-panel";
import { TimelinePanel } from "./panels/timeline-panel";
import { ImportantEventsPanel } from "./panels/events-panel";
import { AnnotationsPanel } from "./panels/annotations-panel";
import { AnalyticsPanel } from "./panels/analytics-panel";
import { SearchPanel } from "./panels/search-panel";
import { CoauthorChat } from "./coauthor-chat";
import { StorySettingsDialog } from "./story-settings-dialog";
import { ExportMenu } from "./export-menu";
import { FocusMode } from "./focus-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
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
  document: { label: "Documento", icon: FileText, description: "Visão organizada de toda a história" },
  characters: { label: "Personagens", icon: Users, description: "Quem habita sua história" },
  chapters: { label: "Capítulos", icon: BookOpen, description: "A estrutura narrativa" },
  timeline: { label: "Cronologia", icon: Clock, description: "A ordem dos acontecimentos" },
  events: { label: "Acontecimentos", icon: Sparkles, description: "Eventos importantes aprovados" },
  annotations: { label: "Anotações", icon: StickyNote, description: "Ideias, perguntas e decisões" },
  analytics: { label: "Analytics", icon: BarChart3, description: "Estatísticas e insights da escrita" },
  search: { label: "Buscar", icon: Search, description: "Busca inteligente na história" },
};

function isTitlePlaceholder(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length <= 3) return true;
  if (/^[.\-_\s]+$/.test(trimmed)) return true;
  if (/^(sem título|sem nome|titulo|title|nova história|história)$/i.test(trimmed)) return true;
  return false;
}

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();

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

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<{ title: string; description: string; status: string; genre: string; tone: string }>) =>
      api.updateStory(storyId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
  });

  const startEditTitle = () => {
    if (!meta) return;
    setTitleDraft(meta.title);
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    if (!meta || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    const newTitle = titleDraft.trim();
    if (newTitle === meta.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await updateMutation.mutateAsync({ title: newTitle });
      setMeta({ ...meta, title: newTitle });
      toast.success("Título atualizado 🌸");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar título");
    } finally {
      setEditingTitle(false);
    }
  };

  const cancelEditTitle = () => {
    setEditingTitle(false);
    setTitleDraft(meta?.title || "");
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditTitle();
    }
  };

  const handleSaveSettings = async (data: {
    title: string; description: string; genre: string; tone: string; status: string;
  }) => {
    try {
      await updateMutation.mutateAsync(data);
      setMeta({
        ...meta!,
        title: data.title,
        description: data.description || null,
        genre: data.genre || null,
        tone: data.tone || null,
        status: data.status,
      });
      toast.success("Configurações salvas 🌸");
      setSettingsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
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
  const showTitleHint = isTitlePlaceholder(meta.title) && !editingTitle;

  const handleSectionClick = (s: StorySection) => {
    setSection(s);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="h-screen flex flex-col flora-bg-primary overflow-hidden">
      {/* Top header */}
      <header className="flex-shrink-0 h-14 bg-[#C48D9E] text-white flex items-center px-2 sm:px-4 gap-2 sm:gap-3 border-b border-white/10">
        {/* Mobile: hamburger */}
        <Button
          onClick={() => setMobileSidebarOpen(true)}
          variant="ghost"
          size="sm"
          className="lg:hidden text-white hover:bg-white/15"
        >
          <Menu className="w-4 h-4" />
        </Button>

        <Button
          onClick={closeStory}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <div className="hidden sm:block h-6 w-px bg-white/30" />
        <Flower2 className="w-5 h-5 flex-shrink-0" />

        {/* Título editável inline */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {editingTitle ? (
            <>
              <Input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={saveTitle}
                placeholder="Título da história..."
                maxLength={120}
                className="h-8 bg-white/95 text-[#4A2C3A] border-0 text-sm font-semibold max-w-md"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); saveTitle(); }}
                className="p-1 hover:bg-white/15 rounded transition flex-shrink-0"
                title="Salvar (Enter)"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); cancelEditTitle(); }}
                className="p-1 hover:bg-white/15 rounded transition flex-shrink-0"
                title="Cancelar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <h1
                onClick={startEditTitle}
                className="font-semibold truncate cursor-pointer hover:bg-white/10 px-2 py-1 rounded transition flex items-center gap-1.5 group min-w-0"
                title="Clique para editar o título"
              >
                <span className="truncate">{meta.title || "(sem título)"}</span>
                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-70 transition flex-shrink-0" />
              </h1>
              {showTitleHint && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition items-center gap-1 flex-shrink-0"
                  title="Sugira um título melhor"
                >
                  <Sparkle className="w-3 h-3" />
                  Sugestão?
                </button>
              )}
            </>
          )}
        </div>

        {/* Ações */}
        <Button
          onClick={() => setFocusMode(true)}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15 flex-shrink-0"
          title="Modo Foco (Pomodoro)"
        >
          <Target className="w-4 h-4" />
          <span className="hidden md:inline ml-1">Foco</span>
        </Button>

        <Button
          onClick={() => setSettingsOpen(true)}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15 flex-shrink-0"
          title="Configurações da história"
        >
          <Settings className="w-4 h-4" />
        </Button>

        <ExportMenu
          storyId={storyId}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15 flex-shrink-0"
        />

        <Button
          onClick={toggleChat}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15 flex-shrink-0"
        >
          {chatOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </header>

      {/* 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Coluna 1 — Sidebar (desktop) */}
        <aside
          className={`hidden lg:flex flex-shrink-0 transition-all duration-300 ${
            sidebarCollapsed ? "w-16" : "w-60"
          } bg-[#C48D9E] text-white flex-col`}
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

        {/* Sidebar mobile (Sheet) */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-72 bg-[#C48D9E] text-white border-0 p-0">
            <SheetHeader className="p-4 border-b border-white/15">
              <SheetTitle className="text-white flex items-center gap-2">
                <Flower2 className="w-4 h-4" />
                {meta.title}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <StorySidebar
                collapsed={false}
                currentSection={currentSection}
                onSection={handleSectionClick}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Coluna 2 — Main content */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E6C2C7] bg-white/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flora-gradient-accent flex items-center justify-center flex-shrink-0">
                <SectionIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-bold flora-text-primary truncate">{section.label}</h2>
                <p className="text-xs flora-text-secondary truncate">{section.description}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {currentSection === "document" && <DocumentPanel storyId={storyId} />}
            {currentSection === "characters" && <CharactersPanel storyId={storyId} />}
            {currentSection === "chapters" && <ChaptersPanel storyId={storyId} />}
            {currentSection === "timeline" && <TimelinePanel storyId={storyId} />}
            {currentSection === "events" && <ImportantEventsPanel storyId={storyId} />}
            {currentSection === "annotations" && <AnnotationsPanel storyId={storyId} />}
            {currentSection === "analytics" && <AnalyticsPanel storyId={storyId} />}
            {currentSection === "search" && <SearchPanel storyId={storyId} />}
          </div>
        </main>

        {/* Coluna 3 — Coauthor chat (desktop) */}
        {chatOpen && (
          <motion.aside
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            className="hidden md:flex w-96 flex-shrink-0 border-l border-[#E6C2C7] bg-white flex-col"
          >
            <CoauthorChat storyId={storyId} />
          </motion.aside>
        )}
      </div>

      {/* Chat mobile (overlay) — quando chatOpen em mobile */}
      {chatOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-[#E6C2C7] bg-[#C48D9E] text-white">
            <span className="font-medium">🌸 Flora</span>
            <Button onClick={toggleChat} variant="ghost" size="sm" className="text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CoauthorChat storyId={storyId} />
          </div>
        </div>
      )}

      {/* Modal de configurações */}
      <StorySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        story={meta}
        onSave={handleSaveSettings}
      />

      {/* Modo Foco */}
      <FocusMode
        open={focusMode}
        onClose={() => setFocusMode(false)}
        storyId={storyId}
      />
    </div>
  );
}
