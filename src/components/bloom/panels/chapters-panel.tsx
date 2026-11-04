"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, BookOpen, X, Save, ChevronRight, History, RotateCcw, Loader2, Bold, Italic, Heading1, Minus, Type, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useStoryStore, type Chapter } from "@/stores/story-store";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props { storyId: string }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-[#E8C98B] text-[#4A2C3A]" },
  WRITING: { label: "Escrevendo", color: "bg-[#D4818B] text-white" },
  REVISION: { label: "Revisão", color: "bg-[#C48D9E] text-white" },
  COMPLETED: { label: "Concluído", color: "bg-[#7EB8A2] text-white" },
};

export function ChaptersPanel({ storyId }: Props) {
  const chapters = useStoryStore((s) => s.currentStory?.chapters || []);
  const addChapter = useStoryStore((s) => s.addChapter);
  const updateChapter = useStoryStore((s) => s.updateChapter);
  const removeChapter = useStoryStore((s) => s.removeChapter);
  const currentChapterId = useUIStore((s) => s.currentChapterId);
  const setCurrentChapter = useUIStore((s) => s.setCurrentChapter);
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { number?: number; title?: string }) =>
      api.createChapter(storyId, data) as Promise<Chapter>,
    onSuccess: (c) => {
      addChapter(c);
      setCreating(false);
      setNewTitle("");
      setCurrentChapter(c.id);
      toast.success(`Capítulo ${c.number} criado 🌸`);
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Chapter> }) =>
      api.updateChapter(storyId, id, patch),
    onSuccess: (_d, { id, patch }) => updateChapter(id, patch),
    onError: (e: Error) => toast.error(e.message || "Erro ao salvar capítulo"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteChapter(storyId, id),
    onSuccess: (_d, id) => {
      removeChapter(id);
      if (currentChapterId === id) setCurrentChapter(null);
      toast.info("Capítulo removido");
    },
    onError: (error: Error) => toast.error(error.message || "Erro ao remover capítulo"),
  });

  const currentChapter = chapters.find((c) => c.id === currentChapterId);

  // Se há capítulo selecionado, mostra editor; senão, mostra lista
  if (currentChapter) {
    return (
      <ChapterEditor
        storyId={storyId}
        chapter={currentChapter}
        onBack={() => setCurrentChapter(null)}
        onUpdate={(patch) => updateMutation.mutateAsync({ id: currentChapter.id, patch })}
        onRestored={(restored) => {
          updateChapter(restored.id, restored);
          qc.invalidateQueries({ queryKey: ["story", storyId] });
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm flora-text-secondary">
          {chapters.length} {chapters.length === 1 ? "capítulo" : "capítulos"}
        </p>
        <Button
          onClick={() => setCreating(true)}
          className="flora-gradient-accent text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo capítulo
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 bg-[#FADADD] rounded-2xl p-5 flora-border border overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flora-text-primary">Novo capítulo</h3>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flora-text-secondary">Título (opcional)</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: A primeira camélia"
                className="bg-white border-[#E6C2C7]"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate({ title: newTitle || undefined })}
                disabled={createMutation.isPending}
                className="flora-gradient-accent text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {chapters.length === 0 && !creating ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full flora-gradient-soft mb-4">
            <BookOpen className="w-7 h-7 text-[#C48D9E]" />
          </div>
          <h3 className="font-bold flora-text-primary mb-1">Nenhum capítulo ainda</h3>
          <p className="text-sm flora-text-secondary mb-4">
            Comece a estruturar sua narrativa.
          </p>
          <Button onClick={() => setCreating(true)} className="flora-gradient-accent text-white">
            <Plus className="w-4 h-4 mr-1" />
            Criar primeiro capítulo
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map((c) => {
            const status = STATUS_LABELS[c.status] || STATUS_LABELS.DRAFT;
            return (
              <motion.div
                key={c.id}
                layout
                onClick={() => setCurrentChapter(c.id)}
                className="group bg-white rounded-xl flora-border border p-4 hover:flora-shadow-soft cursor-pointer transition flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg flora-gradient-romantic flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{c.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold flora-text-primary truncate">
                    {c.title || `Capítulo ${c.number}`}
                  </h3>
                  <p className="text-xs flora-text-secondary line-clamp-1">
                    {c.summary || c.content?.slice(0, 80) || "Sem conteúdo ainda"}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                  {status.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remover o capítulo "${c.title || `Capítulo ${c.number}`}"? Esta ação não pode ser desfeita.`)) {
                      deleteMutation.mutate(c.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  aria-label={`Remover capítulo ${c.title || c.number}`}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition text-[#8B6B7A] hover:text-[#D4818B] p-1 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 flora-text-secondary" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ChapterVersion {
  id: string;
  createdAt: string;
  excerpt: string;
  characters: number;
  title: string | null;
}
interface ChapterVersionDetail {
  content: string;
  title: string | null;
  summary: string | null;
  status: string | null;
  createdAt: string;
}

function ChapterEditor({
  storyId,
  chapter,
  onBack,
  onUpdate,
  onRestored,
}: {
  storyId: string;
  chapter: Chapter;
  onBack: () => void;
  onUpdate: (patch: Partial<Chapter>) => Promise<unknown>;
  onRestored: (chapter: Chapter) => void;
}) {
  const [title, setTitle] = useState(chapter.title || "");
  const [summary, setSummary] = useState(chapter.summary || "");
  const [content, setContent] = useState(chapter.content || "");
  const [status, setStatus] = useState(chapter.status);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<{ id: string; data: ChapterVersionDetail } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [fontMode, setFontMode] = useState<"serif" | "sans" | "mono">("serif");
  const [wordGoal, setWordGoal] = useState(1000);
  const [saveState, setSaveState] = useState<"saved" | "editing" | "saving" | "error">("saved");
  const [localBackup, setLocalBackup] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<Chapter>>({});
  const updateRef = useRef(onUpdate);
  const pendingPromiseRef = useRef<Promise<unknown>>(Promise.resolve());
  updateRef.current = onUpdate;
  const draftKey = `bloom-chapter-draft-${chapter.id}`;
  const prefKey = `bloom-editor-prefs-${storyId}`;
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(prefKey) || "{}") as { font?: string; goal?: number };
      if (["serif", "sans", "mono"].includes(prefs.font || "")) setFontMode(prefs.font as "serif" | "sans" | "mono");
      if (Number.isSafeInteger(prefs.goal) && prefs.goal! >= 50 && prefs.goal! <= 100000) setWordGoal(prefs.goal!);
      const draft = localStorage.getItem(draftKey);
      if (draft !== null && draft !== (chapter.content || "")) setLocalBackup(draft);
    } catch { /* um bloqueio no armazenamento local não impede escrita no servidor */ }
  }, [draftKey, prefKey, chapter.content]);

  const savePrefs = (font: "serif" | "sans" | "mono", goal: number) => {
    try { localStorage.setItem(prefKey, JSON.stringify({ font, goal })); } catch { /* local opcional */ }
  };

  // Une as edições dos campos antes de salvar, evitando perder alterações rápidas.
  const flushSave = async (): Promise<void> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const patch = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(patch).length > 0) {
      setSaveState("saving");
      pendingPromiseRef.current = pendingPromiseRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            await updateRef.current(patch);
            if (Object.keys(pendingRef.current).length === 0 && 
                (patch.content === undefined || contentRef.current === patch.content)) {
              setSaveState("saved");
              if (patch.content !== undefined) {
                try { localStorage.removeItem(draftKey); } catch {}
                setLocalBackup(null);
              }
            }
          } catch (error) {
            setSaveState("error");
            throw error;
          }
        });
    }
    await pendingPromiseRef.current;
  };

  const scheduleSave = (patch: Partial<Chapter>) => {
    setSaveState("editing");
    if (patch.content !== undefined) {
      try { localStorage.setItem(draftKey, patch.content || ""); } catch {}
    }
    pendingRef.current = { ...pendingRef.current, ...patch };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flushSave().catch(() => undefined); }, 1200);
  };

  // Ao trocar de painel, envia imediatamente o que ainda não foi salvo.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const patch = pendingRef.current;
    if (Object.keys(patch).length > 0) {
      void updateRef.current(patch).catch(() => undefined);
    }
  }, []);

  const openHistory = async () => {
    try { await flushSave(); }
    catch { toast.error("Salve as alterações antes de recuperar uma versão."); return; }
    setHistoryOpen(true);
    setSelectedVersion(null);
    setLoadingVersions(true);
    try {
      const resp = await fetch(`/api/stories/${storyId}/writing-history?kind=CHAPTER&chapterId=${chapter.id}`);
      if (!resp.ok) throw new Error();
      const data = await resp.json() as { versions: ChapterVersion[] };
      setVersions(data.versions);
    } catch { toast.error("Não foi possível carregar as versões deste capítulo."); }
    finally { setLoadingVersions(false); }
  };

  const previewVersion = async (id: string) => {
    try {
      const resp = await fetch(`/api/stories/${storyId}/writing-history?kind=CHAPTER&chapterId=${chapter.id}&versionId=${encodeURIComponent(id)}`);
      if (!resp.ok) throw new Error();
      const data = await resp.json() as { version: ChapterVersionDetail };
      setSelectedVersion({ id, data: data.version });
    } catch { toast.error("Não foi possível abrir essa versão."); }
  };

  const restoreVersion = async () => {
    if (!selectedVersion || restoring) return;
    if (!window.confirm("Recuperar esta versão do capítulo? A versão atual será preservada no histórico.")) return;
    setRestoring(true);
    try {
      await flushSave();
      const result = await api.updateChapter(storyId, chapter.id, {
        restoreVersionId: selectedVersion.id,
      }) as { chapter: Chapter };
      const restored = result.chapter;
      setTitle(restored.title || "");
      setSummary(restored.summary || "");
      setContent(restored.content || "");
      setStatus(restored.status);
      onRestored(restored);
      setHistoryOpen(false);
      toast.success("Versão do capítulo recuperada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível recuperar o capítulo.");
    } finally { setRestoring(false); }
  };

  const words = content.trim().split(/\\s+/).filter(Boolean).length;
  const chars = content.length;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));
  const goalPercent = Math.min(100, Math.round((words / wordGoal) * 100));

  const insertMarkdown = (before: string, after = "") => {
    const el = textAreaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = before + selected + after;
    const next = content.slice(0, start) + replacement + content.slice(end);
    setContent(next);
    scheduleSave({ content: next });
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length;
      el.setSelectionRange(cursor, cursor + selected.length);
    });
  };

  const recoverDraft = () => {
    if (localBackup === null) return;
    if (!window.confirm("Recuperar o rascunho deste navegador? O texto salvo no banco poderá ser encontrado no histórico de versões.")) return;
    setContent(localBackup);
    contentRef.current = localBackup;
    scheduleSave({ content: localBackup });
    setLocalBackup(null);
  };

  const backSafely = async () => {
    try {
      await flushSave();
      onBack();
    } catch {
      toast.error("Seu texto não foi salvo no banco. Tente novamente antes de voltar.");
    }
  };

  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.DRAFT;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => void backSafely()} className="text-[#8B6B7A]">
          <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
          Voltar à lista
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void openHistory()}
            className="border-[#C48D9E] text-[#B24C63]">
            <History className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Versões</span>
          </Button>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              scheduleSave({ status: v });
            }}
          >
            <SelectTrigger className="w-36 bg-white border-[#E6C2C7]">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="WRITING">Escrevendo</SelectItem>
              <SelectItem value="REVISION">Revisão</SelectItem>
              <SelectItem value="COMPLETED">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {localBackup !== null && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <span><AlertTriangle className="mr-2 inline h-4 w-4" /> Existe um rascunho local diferente do texto do servidor.</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={recoverDraft}>Recuperar rascunho</Button>
            <Button variant="ghost" size="sm" onClick={() => { setLocalBackup(null); localStorage.removeItem(draftKey); }}>Usar versão da nuvem</Button>
          </div>
        </div>
      )}

      <div className="mb-5 rounded-xl border border-[#E6C2C7] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" title="Negrito Markdown" aria-label="Negrito" onClick={() => insertMarkdown("**", "**")}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Itálico Markdown" aria-label="Itálico" onClick={() => insertMarkdown("*", "*")}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Título de cena Markdown" aria-label="Título de cena" onClick={() => insertMarkdown("\\n## ", "\\n")}>
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" title="Separador de cena" aria-label="Separador de cena" onClick={() => insertMarkdown("\\n\\n---\\n\\n")}>
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-[#B24C63]" />
            <select aria-label="Fonte do editor" value={fontMode} onChange={event => {
              const font = event.target.value as typeof fontMode;
              setFontMode(font);
              savePrefs(font, wordGoal);
            }} className="rounded-lg border border-[#E6C2C7] bg-white px-2 py-1.5 text-xs flora-text-primary">
              <option value="serif">Literária</option>
              <option value="sans">Moderna</option>
              <option value="mono">Máquina de escrever</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => void flushSave().catch(() => toast.error("Falha ao salvar capítulo."))}>
              <Save className="mr-1 h-3.5 w-3.5" /> Salvar
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#F3E1E3] pt-3 text-xs flora-text-secondary">
          <span><strong className="flora-text-primary">{words}</strong> palavras</span>
          <span>{chars.toLocaleString("pt-BR")} caracteres</span>
          <span>~{readingMinutes} min de leitura</span>
          <span className="ml-auto flex items-center gap-1" role="status" aria-live="polite">
            {saveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
              saveState === "saved" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> :
                saveState === "error" ? <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> : <Save className="h-3.5 w-3.5" />}
            {saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo no banco" :
              saveState === "error" ? "Erro: rascunho local preservado" : "Alterações pendentes"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs flora-text-secondary">
          <Target className="h-3.5 w-3.5 text-[#B24C63]" />
          <label htmlFor="chapter-word-goal">Meta do capítulo</label>
          <input id="chapter-word-goal" type="number" min={50} max={100000} step={50}
            value={wordGoal} onChange={event => {
              const value = Number(event.target.value);
              if (!Number.isSafeInteger(value) || value < 50 || value > 100000) return;
              setWordGoal(value);
              savePrefs(fontMode, value);
            }} className="w-20 rounded-md border border-[#E6C2C7] p-1 text-center" />
          <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-[#F3E1E3]">
            <div className="h-full rounded-full bg-[#B24C63]" style={{ width: `${goalPercent}%` }} />
          </div>
          <span>{goalPercent}%</span>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <Label className="text-xs flora-text-secondary mb-1.5 block">
            Capítulo {chapter.number}
          </Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            placeholder="Título do capítulo"
            onBlur={() => { void flushSave().catch(() => undefined); }}
            className="text-2xl font-bold border-[#E6C2C7] bg-white"
          />
        </div>

        <div>
          <Label className="text-xs flora-text-secondary mb-1.5 block">
            Resumo <span className="italic">(uma frase sobre o que acontece)</span>
          </Label>
          <Textarea
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              scheduleSave({ summary: e.target.value });
            }}
            placeholder="Helena chega à casa de Tia Rosa e percebe que o jardim está vivo demais para uma propriedade abandonada."
            rows={2}
            onBlur={() => { void flushSave().catch(() => undefined); }}
            className="bg-white border-[#E6C2C7] resize-none italic"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs flora-text-secondary">
              Conteúdo do capítulo
            </Label>
            <span className="text-xs flora-text-secondary">
              {content.split(/\s+/).filter(Boolean).length} palavras
            </span>
          </div>
          <Textarea
            ref={textAreaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              contentRef.current = e.target.value;
              scheduleSave({ content: e.target.value });
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                void flushSave().catch(() => toast.error("Falha ao salvar capítulo."));
              }
            }}
            placeholder="Comece a escrever... A Flora pode ajudar com cenas, descrições e desenvolvimento."
            rows={20}
            spellCheck
            onBlur={() => { void flushSave().catch(() => undefined); }}
            className={`min-h-[52vh] resize-y border-[#E6C2C7] bg-white p-5 text-base leading-8 flora-text-primary sm:p-7 ${fontMode === "serif" ? "font-serif" : fontMode === "mono" ? "font-mono" : "font-sans"}`}
          />
          <p className="text-xs flora-text-secondary mt-2 italic">
            💮 Salva após 1,2 segundo sem digitar ou ao sair do campo.
          </p>
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[88dvh] max-w-2xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flora-text-primary">
              <History className="h-5 w-5" /> Versões do capítulo
            </DialogTitle>
            <DialogDescription>Selecione uma versão para visualizar o texto antes de recuperar.</DialogDescription>
          </DialogHeader>
          {loadingVersions ? <p className="py-6 text-sm flora-text-secondary">Carregando versões...</p> :
            versions.length === 0 ? <p className="py-6 text-sm flora-text-secondary">Ainda não há versões salvas deste capítulo.</p> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {versions.map((version) => (
                  <button key={version.id} type="button" onClick={() => void previewVersion(version.id)}
                    className={`rounded-xl border p-3 text-left hover:bg-[#FDF2F0] ${selectedVersion?.id === version.id ? "border-[#B24C63] bg-[#FADADD]" : "border-[#E6C2C7]"}`}>
                    <p className="text-sm font-semibold flora-text-primary">{new Date(version.createdAt).toLocaleString("pt-BR")}</p>
                    <p className="text-xs flora-text-secondary">{version.title || chapter.title || `Capítulo ${chapter.number}`} · {version.characters} caracteres</p>
                    <p className="mt-1 line-clamp-2 text-xs flora-text-secondary">{version.excerpt || "(vazio)"}</p>
                  </button>
                ))}
              </div>
            )}
          {selectedVersion && (
            <div className="rounded-xl border border-[#E6C2C7] bg-[#FDF2F0] p-4">
              <h3 className="font-semibold flora-text-primary">{selectedVersion.data.title || "Capítulo sem título"}</h3>
              <p className="mt-1 text-xs flora-text-secondary">{selectedVersion.data.summary}</p>
              <div className="my-3 max-h-44 overflow-y-auto whitespace-pre-wrap text-sm flora-text-primary">
                {selectedVersion.data.content || "(texto vazio)"}
              </div>
              <Button onClick={() => void restoreVersion()} disabled={restoring} className="flora-gradient-accent text-white">
                {restoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Recuperar esta versão
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
