"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Clock, Cloud, CloudOff, Copy, History, Loader2, Pen, RotateCcw, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props { storyId: string }
interface ServerDraft { content: string; version: number; updatedAt: string | null }
interface Version { id: string; createdAt: string; excerpt: string; characters: number; title: string | null }
interface VersionDetail { content: string; createdAt: string }
type SaveState = "loading" | "saved" | "editing" | "saving" | "offline" | "conflict";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Falha ao comunicar com o servidor") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export function FreeWritePanel({ storyId }: Props) {
  const qc = useQueryClient();
  const key = `bloom-free-write-${storyId}`;
  const root = `/api/stories/${encodeURIComponent(storyId)}`;

  const [content, setContent] = useState("");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [backupFound, setBackupFound] = useState<string | null>(null);
  const [organizing, setOrganizing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<{ id: string; data: VersionDetail } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const versionRef = useRef(0);
  const savedRef = useRef("");
  const currentRef = useRef("");
  const savingRef = useRef(false);
  const readyRef = useRef(false);
  const conflictRef = useRef(false);

  useEffect(() => {
    let active = true;
    readyRef.current = false;
    conflictRef.current = false;
    setReady(false);
    setSaveState("loading");
    setBackupFound(null);
    setContent("");
    currentRef.current = "";

    void (async () => {
      const local = window.localStorage.getItem(key) || "";
      try {
        const remote = await fetchJson<ServerDraft>(`${root}/free-write`);
        if (!active) return;
        versionRef.current = remote.version;
        savedRef.current = remote.content;
        setSavedAt(remote.updatedAt ? new Date(remote.updatedAt) : null);

        if (local && local !== remote.content && remote.content) {
          // Mantém o rascunho antigo mesmo antes de reconciliar os dois conteúdos.
          window.localStorage.setItem(`${key}-legacy-backup`, local);
          setBackupFound(local);
        }

        const initial = !remote.content && local ? local : remote.content;
        currentRef.current = initial;
        setContent(initial);
        setSaveState(initial === remote.content ? "saved" : "editing");
      } catch {
        if (!active) return;
        currentRef.current = local;
        setContent(local);
        setSaveState("offline");
        toast.error("Não foi possível acessar o banco. Seu texto local continua preservado.");
      } finally {
        if (active) {
          readyRef.current = true;
          setReady(true);
        }
      }
    })();

    return () => { active = false; readyRef.current = false; };
  }, [key, root]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!readyRef.current || conflictRef.current) return false;
    if (savingRef.current) return false;
    const snapshot = currentRef.current;
    if (snapshot === savedRef.current) { setSaveState("saved"); return true; }
    savingRef.current = true;
    setSaveState("saving");
    try {
      const result = await fetchJson<ServerDraft>(`${root}/free-write`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: snapshot, expectedVersion: versionRef.current }),
      });
      versionRef.current = result.version;
      savedRef.current = snapshot;
      setSavedAt(new Date());
      setSaveState(currentRef.current === snapshot ? "saved" : "editing");
      return true;
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        conflictRef.current = true;
        setSaveState("conflict");
      } else {
        setSaveState("offline");
      }
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [root]);

  useEffect(() => {
    if (!ready) return;
    // Backup local é escrito imediatamente: erro de rede nunca apaga o rascunho.
    window.localStorage.setItem(key, content);
    if (content === savedRef.current || conflictRef.current) return;
    setSaveState((s) => s === "offline" ? "offline" : "editing");
    const timer = window.setTimeout(() => { void save(); }, 1400);
    return () => window.clearTimeout(timer);
  }, [content, key, ready, save, savedAt]);

  const edit = (text: string) => {
    currentRef.current = text;
    window.localStorage.setItem(key, text);
    setContent(text);
  };

  const retry = async () => {
    if (conflictRef.current) {
      const local = currentRef.current;
      try {
        const remote = await fetchJson<ServerDraft>(`${root}/free-write`);
        if (!window.confirm("O servidor tem alterações de outra sessão. Substituí-las pelo texto desta tela? A versão anterior continuará no histórico.")) return;
        versionRef.current = remote.version;
        savedRef.current = remote.content;
        conflictRef.current = false;
        currentRef.current = local;
        return void save();
      } catch { toast.error("Não foi possível consultar a versão atual."); return; }
    }
    if (saveState === "offline" && versionRef.current === 0) {
      try {
        const remote = await fetchJson<ServerDraft>(`${root}/free-write`);
        versionRef.current = remote.version;
        savedRef.current = remote.content;
        if (remote.content && remote.content !== currentRef.current) {
          conflictRef.current = true;
          setSaveState("conflict");
          return;
        }
      } catch { /* próxima tentativa quando a rede voltar */ }
    }
    void save();
  };

  const loadHistory = async () => {
    setHistoryOpen(true);
    setSelectedVersion(null);
    setHistoryLoading(true);
    try {
      const result = await fetchJson<{ versions: Version[] }>(`${root}/writing-history?kind=FREEWRITE`);
      setVersions(result.versions);
    } catch { toast.error("Não foi possível consultar o histórico."); }
    finally { setHistoryLoading(false); }
  };

  const preview = async (id: string) => {
    setPreviewLoading(true);
    try {
      const result = await fetchJson<{ version: VersionDetail }>(`${root}/writing-history?kind=FREEWRITE&versionId=${encodeURIComponent(id)}`);
      setSelectedVersion({ id, data: result.version });
    } catch { toast.error("Versão indisponível."); }
    finally { setPreviewLoading(false); }
  };

  const restore = () => {
    if (!selectedVersion) return;
    if (!window.confirm("Restaurar este texto? O conteúdo atual será mantido no histórico se já estiver salvo no banco.")) return;
    edit(selectedVersion.data.content);
    setHistoryOpen(false);
    setSelectedVersion(null);
    toast.success("Texto recuperado. Salvamento no banco iniciado.");
    window.setTimeout(() => { void save(); }, 50);
  };

  const handleClear = () => {
    if (!window.confirm("Limpar a Escrita Livre? Você poderá recuperar versões salvas pelo histórico.")) return;
    edit("");
  };

  const handleOrganize = async () => {
    if (content.trim().length < 50) return;
    if (conflictRef.current || saveState === "offline") {
      toast.error("Resolva o salvamento antes de organizar para não perder seu texto.");
      return;
    }
    setOrganizing(true);
    try {
      if (content !== savedRef.current && !(await save())) {
        toast.error("O texto ainda não foi salvo no banco.");
        return;
      }
      const result = await fetchJson<{ summary: string }>(`${root}/organize-free-write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      toast.success(result.summary, { duration: 6000 });
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao organizar");
    } finally { setOrganizing(false); }
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characters = content.length;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold flora-text-primary">
            <Pen className="h-5 w-5 text-[#B24C63]" /> Escrita Livre
          </h2>
          <p className="mt-1 max-w-2xl text-sm flora-text-secondary">
            Escreva ideias, cenas ou diálogos sem regras. Seu texto é salvo na nuvem, com cópia de segurança no dispositivo.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadHistory()}
          className="border-[#C48D9E] text-[#B24C63]">
          <History className="mr-2 h-4 w-4" /> Histórico de versões
        </Button>
      </div>

      {backupFound && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Encontramos um rascunho anterior neste navegador.</p>
          <p>O texto salvo na nuvem foi mantido. Você pode recuperar o rascunho local sem perder sua cópia anterior.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { edit(backupFound); setBackupFound(null); }}>
              Usar rascunho do navegador
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setBackupFound(null)}>Continuar com a nuvem</Button>
          </div>
        </div>
      )}

      {(saveState === "offline" || saveState === "conflict") && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveState === "conflict" ? "Outra sessão alterou este texto. Seu rascunho local está seguro." :
              "Sem conexão com o armazenamento. O texto continua salvo neste navegador."}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void retry()}>Resolver / tentar novamente</Button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs flora-text-secondary">
        <span><strong className="flora-text-primary">{words}</strong> palavras</span>
        <span><strong className="flora-text-primary">{characters}</strong> caracteres</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {readingMinutes} min de leitura</span>
        <span role="status" aria-live="polite" className="ml-auto flex items-center gap-1 font-medium">
          {saveState === "saving" || saveState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> :
            saveState === "saved" ? <Cloud className="h-4 w-4 text-emerald-600" /> :
              saveState === "editing" ? <Save className="h-4 w-4" /> : <CloudOff className="h-4 w-4 text-rose-600" />}
          {saveState === "saved" ? `Salvo na nuvem${savedAt ? " às " + savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}` :
            saveState === "saving" ? "Salvando..." :
              saveState === "loading" ? "Carregando..." :
                saveState === "editing" ? "Alterações pendentes" : "Somente cópia local"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E6C2C7] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#C48D9E]/35">
        <Textarea
          value={content}
          disabled={!ready}
          onChange={(event) => edit(event.target.value)}
          onBlur={() => void save()}
          placeholder="Seu próximo capítulo começa por aqui... Escreva livremente suas ideias, cenas e diálogos."
          aria-label="Texto da escrita livre"
          className="min-h-[48vh] w-full resize-y border-0 bg-transparent p-5 font-serif text-base leading-8 flora-text-primary focus-visible:ring-0 sm:p-7"
          maxLength={250000}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs flora-text-secondary">
          <Sparkles className="h-4 w-4" /> A Flora pode organizar este texto em capítulos e personagens.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void save()}
            disabled={!ready || saveState === "saving"} className="border-[#C48D9E] text-[#B24C63]">
            <Save className="mr-1 h-4 w-4" /> Salvar agora
          </Button>
          <Button variant="outline" size="sm" disabled={!content.trim()} onClick={() => {
            void navigator.clipboard.writeText(content).then(() => toast.success("Texto copiado")).catch(() => toast.error("Falha ao copiar"));
          }} className="border-[#C48D9E] text-[#B24C63]">
            <Copy className="mr-1 h-4 w-4" /> Copiar
          </Button>
          <Button size="sm" disabled={!ready || organizing || content.trim().length < 50} onClick={() => void handleOrganize()}
            className="flora-gradient-accent text-white">
            {organizing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
            {organizing ? "Organizando..." : "Organizar com Flora"}
          </Button>
          <Button variant="ghost" size="sm" disabled={!content} onClick={handleClear} className="text-rose-700">
            <Trash2 className="mr-1 h-4 w-4" /> Limpar
          </Button>
        </div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[88dvh] max-w-2xl overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flora-text-primary">
              <History className="h-5 w-5" /> Histórico da Escrita Livre
            </DialogTitle>
            <DialogDescription>Veja e restaure versões salvas na nuvem. Restaurar não apaga as demais versões.</DialogDescription>
          </DialogHeader>
          {historyLoading ? <p className="py-8 text-center text-sm">Carregando versões...</p> :
            versions.length === 0 ? <p className="py-6 text-sm flora-text-secondary">Ainda não há versões salvas.</p> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {versions.map((v) => (
                  <button type="button" key={v.id} onClick={() => void preview(v.id)}
                    className={`rounded-xl border p-3 text-left transition hover:bg-[#FDF2F0] ${selectedVersion?.id === v.id ? "border-[#B24C63] bg-[#FADADD]" : "border-[#E6C2C7]"}`}>
                    <p className="text-sm font-semibold flora-text-primary">{new Date(v.createdAt).toLocaleString("pt-BR")}</p>
                    <p className="mt-1 text-xs flora-text-secondary">{v.characters} caracteres</p>
                    <p className="mt-2 line-clamp-2 text-xs flora-text-secondary">{v.excerpt || "(vazio)"}</p>
                  </button>
                ))}
              </div>
            )}
          {previewLoading && <p className="text-sm flora-text-secondary">Carregando prévia...</p>}
          {selectedVersion && (
            <div className="space-y-3 rounded-xl border border-[#E6C2C7] bg-[#FDF2F0] p-4">
              <h3 className="font-semibold flora-text-primary">Prévia da versão</h3>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm flora-text-primary">{selectedVersion.data.content || "(texto vazio)"}</div>
              <Button className="flora-gradient-accent text-white" onClick={restore}>
                <RotateCcw className="mr-2 h-4 w-4" /> Recuperar esta versão
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
