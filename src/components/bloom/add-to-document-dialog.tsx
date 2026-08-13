"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { BookOpen, User, Clock, Sparkles, StickyNote, Pen, Loader2, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { parseStructuredContent } from "@/lib/coauthor/structured-parser";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  initialContent: string;
}

type Target = "structured" | "chapter_new" | "chapter_existing" | "character" | "timeline" | "event" | "annotation" | "freewrite";

const TARGETS: Array<{ value: Target; label: string; icon: typeof BookOpen; desc: string }> = [
  { value: "structured", label: "Auto-separar", icon: Wand2, desc: "Extrai e separa tudo automaticamente" },
  { value: "chapter_new", label: "Novo capítulo", icon: BookOpen, desc: "Cria um capítulo novo" },
  { value: "chapter_existing", label: "Cap. existente", icon: BookOpen, desc: "Anexa a um capítulo" },
  { value: "character", label: "Personagem", icon: User, desc: "Adiciona personagem" },
  { value: "timeline", label: "Cronologia", icon: Clock, desc: "Evento cronológico" },
  { value: "event", label: "Acontecimento", icon: Sparkles, desc: "Evento importante" },
  { value: "annotation", label: "Anotação", icon: StickyNote, desc: "Ideia, pergunta, decisão" },
  { value: "freewrite", label: "Escrita livre", icon: Pen, desc: "Brainstorm sem estrutura" },
];

export function AddToDocumentDialog({ open, onOpenChange, storyId, initialContent }: Props) {
  const qc = useQueryClient();
  const [content, setContent] = useState(initialContent);
  const [target, setTarget] = useState<Target>("structured");
  const [chapters, setChapters] = useState<Array<{ id: string; number: number; title: string | null }>>([]);
  const [selectedChapter, setSelectedChapter] = useState("");
  const [metadata, setMetadata] = useState({ title: "", role: "", category: "IDEA", date: "", impact: "" });

  useEffect(() => { setContent(initialContent); }, [initialContent]);

  useEffect(() => {
    if (open) {
      const parsed = parseStructuredContent(initialContent);
      if (parsed.hasStructure) setTarget("structured");
    }
  }, [open, initialContent]);

  useEffect(() => {
    if (open && target === "chapter_existing") {
      fetch(`/api/stories/${storyId}/chapters`).then(r => r.json()).then(data => {
        if (Array.isArray(data)) { setChapters(data); if (data.length > 0 && !selectedChapter) setSelectedChapter(data[0].id); }
      }).catch(() => {});
    }
  }, [open, target, storyId, selectedChapter]);

  const structuredPreview = useMemo(() => {
    if (target !== "structured") return null;
    const parsed = parseStructuredContent(content);
    if (!parsed.hasStructure) return null;
    return (
      <div className="bg-[#FDF2F0] rounded-xl p-3 flora-border border space-y-2">
        <p className="text-xs font-bold flora-text-primary flex items-center gap-1">
          <Wand2 className="w-3 h-3 text-[#B24C63]" /> Estrutura detectada:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {parsed.chapters.length > 0 && <div className="bg-white rounded-lg p-2"><span className="font-bold text-[#B24C63]">{parsed.chapters.length}</span><span className="flora-text-secondary"> capítulo(s)</span></div>}
          {parsed.characters.length > 0 && <div className="bg-white rounded-lg p-2"><span className="font-bold text-[#5A8870]">{parsed.characters.length}</span><span className="flora-text-secondary"> personagem(ns)</span></div>}
          {parsed.timeline.length > 0 && <div className="bg-white rounded-lg p-2"><span className="font-bold text-[#8B6B3A]">{parsed.timeline.length}</span><span className="flora-text-secondary"> evento(s)</span></div>}
          {parsed.events.length > 0 && <div className="bg-white rounded-lg p-2"><span className="font-bold text-[#B24C63]">{parsed.events.length}</span><span className="flora-text-secondary"> acontec.</span></div>}
        </div>
      </div>
    );
  }, [content, target]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (target === "structured") {
        const res = await fetch(`/api/stories/${storyId}/add-structured`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Erro ${res.status}`); }
        return res.json();
      }
      const body: Record<string, unknown> = { content, target: target.replace("_new", "").replace("_existing", "") };
      if (target === "chapter_existing" && selectedChapter) body.targetId = selectedChapter;
      if (target === "chapter_new" && metadata.title) body.metadata = { title: metadata.title };
      if (target === "character" && metadata.title) body.metadata = { title: metadata.title, role: metadata.role };
      if (target === "timeline" && metadata.title) body.metadata = { title: metadata.title, date: metadata.date };
      if (target === "event" && metadata.title) body.metadata = { title: metadata.title, impact: metadata.impact };
      if (target === "annotation") body.metadata = { category: metadata.category };
      const res = await fetch(`/api/stories/${storyId}/add-to-document`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Erro ${res.status}`); }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || data.summary || "Adicionado!", { duration: 5000 });
      if (data.freewrite) {
        const key = `bloom-free-write-${storyId}`;
        const existing = localStorage.getItem(key) || "";
        localStorage.setItem(key, existing ? `${existing}\n\n${data.content}` : data.content);
      }
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#E6C2C7] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flora-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B24C63]" /> Adicionar ao documento
          </DialogTitle>
          <DialogDescription className="flora-text-secondary">
            Escolha onde este trecho deve ser adicionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs flora-text-secondary uppercase">Conteúdo</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5}
              className="bg-[#FDF2F0] border-[#E6C2C7] resize-none text-sm font-serif" />
          </div>

          {structuredPreview}

          <div className="space-y-2">
            <Label className="text-xs flora-text-secondary uppercase">Adicionar em</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TARGETS.map((t) => {
                const Icon = t.icon;
                const active = target === t.value;
                return (
                  <button key={t.value} onClick={() => setTarget(t.value)}
                    className={`p-3 rounded-xl border text-left transition ${active ? "border-[#B24C63] bg-[#FADADD]" : "border-[#E6C2C7] hover:bg-[#FDF2F0]"}`}>
                    <Icon className={`w-4 h-4 mb-1 ${active ? "text-[#B24C63]" : "text-[#8B6B7A]"}`} />
                    <p className="text-xs font-medium flora-text-primary">{t.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {target === "chapter_existing" && chapters.length > 0 && (
            <Select value={selectedChapter} onValueChange={setSelectedChapter}>
              <SelectTrigger className="bg-white border-[#E6C2C7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {chapters.map((c) => (<SelectItem key={c.id} value={c.id}>Cap. {c.number}{c.title ? ` — ${c.title}` : ""}</SelectItem>))}
              </SelectContent>
            </Select>
          )}

          {target === "chapter_new" && (
            <Input value={metadata.title} onChange={(e) => setMetadata({ ...metadata, title: e.target.value })} placeholder="Título do capítulo" className="border-[#E6C2C7]" />
          )}
          {target === "character" && (
            <div className="grid grid-cols-2 gap-3">
              <Input value={metadata.title} onChange={(e) => setMetadata({ ...metadata, title: e.target.value })} placeholder="Nome" className="border-[#E6C2C7]" />
              <Input value={metadata.role} onChange={(e) => setMetadata({ ...metadata, role: e.target.value })} placeholder="Função" className="border-[#E6C2C7]" />
            </div>
          )}
          {target === "timeline" && (
            <div className="grid grid-cols-2 gap-3">
              <Input value={metadata.title} onChange={(e) => setMetadata({ ...metadata, title: e.target.value })} placeholder="Título" className="border-[#E6C2C7]" />
              <Input value={metadata.date} onChange={(e) => setMetadata({ ...metadata, date: e.target.value })} placeholder="Data" className="border-[#E6C2C7]" />
            </div>
          )}
          {target === "event" && (
            <div className="grid grid-cols-2 gap-3">
              <Input value={metadata.title} onChange={(e) => setMetadata({ ...metadata, title: e.target.value })} placeholder="Título" className="border-[#E6C2C7]" />
              <Input value={metadata.impact} onChange={(e) => setMetadata({ ...metadata, impact: e.target.value })} placeholder="Impacto" className="border-[#E6C2C7]" />
            </div>
          )}
          {target === "annotation" && (
            <Select value={metadata.category} onValueChange={(v) => setMetadata({ ...metadata, category: v })}>
              <SelectTrigger className="bg-white border-[#E6C2C7]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IDEA">💡 Ideia</SelectItem>
                <SelectItem value="QUESTION">❓ Pergunta</SelectItem>
                <SelectItem value="DECISION">🚩 Decisão</SelectItem>
                <SelectItem value="OBSERVATION">👁️ Observação</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !content.trim()}
            className="flora-gradient-accent text-white">
            {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Adicionando...</>
              : target === "structured" ? <><Wand2 className="w-4 h-4 mr-1" /> Separar e adicionar tudo</>
              : <><Check className="w-4 h-4 mr-1" /> Adicionar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
