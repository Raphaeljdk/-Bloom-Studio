"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Sparkle, Loader2, Check } from "lucide-react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story: StoryMeta | null;
  onSave: (data: {
    title: string;
    description: string;
    genre: string;
    tone: string;
    status: string;
  }) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "IN_PROGRESS", label: "Em progresso" },
  { value: "COMPLETED", label: "Concluída" },
  { value: "ON_HOLD", label: "Pausada" },
];

const GENRE_SUGGESTIONS = [
  "Realismo mágico",
  "Romance",
  "Fantasia",
  "Ficção científica",
  "Mistério",
  "Suspense",
  "Drama",
  "Aventura",
  "Terror",
  "Histórico",
  "Literário",
  "Distopia",
];

const TONE_SUGGESTIONS = [
  "Melancólico",
  "Esperançoso",
  "Sombrio",
  "Leve",
  "Contemplativo",
  "Tenso",
  "Lírico",
  "Ironia",
  "Elegíaco",
  "Cômico",
];

export function StorySettingsDialog({ open, onOpenChange, story, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [tone, setTone] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [saving, setSaving] = useState(false);
  const [suggestingTitle, setSuggestingTitle] = useState(false);

  // Sincroniza form quando abre
  useEffect(() => {
    if (open && story) {
      setTitle(story.title || "");
      setDescription(story.description || "");
      setGenre(story.genre || "");
      setTone(story.tone || "");
      setStatus(story.status || "DRAFT");
    }
  }, [open, story]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        genre: genre.trim(),
        tone: tone.trim(),
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSuggestTitle = async () => {
    if (!story) return;
    setSuggestingTitle(true);
    try {
      // Chama o endpoint de chat da Flora pedindo 5 sugestões de título
      const res = await fetch(`/api/stories/${story.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `Estou sem um bom título para minha história. Com base em tudo que já defini (personagens, capítulos, cronologia, acontecimentos), sugira 5 opções de título criativos e evocativos. Formato: lista numerada (1. 2. 3. 4. 5.), apenas os títulos, um por linha, sem explicações longas.`,
        }),
      });
      if (!res.ok) throw new Error("Flora indisponível");
      const data = await res.json();
      const raw = data.displayContent || "";

      // Parser robusto: aceita formatos numerados (1. 2. 3.), com hifens (-), bullets (•) ou emojis
      // Filtra perguntas (linhas com ?) e frases explicativas
      const QUESTION_OR_EXPLANATION_PATTERNS = /\?|^(eis |aqui |segue |primeiramente |para começar|nota:|obs:)/i;
      const lines = raw.split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((l: string) => {
          // Remove prefixos: "1.", "1)", "1-", "-", "•", "*", emojis no início
          return l
            .replace(/^(\d+[.)\s]+|[-•*]\s+|^[🌸🎀🌷💮]\s*)/, "")
            .replace(/[*_`]/g, "")
            .trim();
        })
        .filter((l: string) =>
          l.length >= 3 &&
          l.length <= 100 &&
          !QUESTION_OR_EXPLANATION_PATTERNS.test(l) &&
          !l.endsWith(":") // não é header de seção
        )
        .slice(0, 5);

      if (lines.length === 0) {
        // Fallback: mostra toast pedindo para conferir o chat
        toast.info("A Flora respondeu no chat — confira as sugestões lá 🌸");
      } else {
        // Preenche o primeiro título e mostra toast com quantas sugestões
        setTitle(lines[0]);
        toast.success(
          `${lines.length} sugestõe${lines.length === 1 ? "" : "s"} de título! Primeira aplicada — confira o restante no chat com a Flora 🌸`,
          { duration: 6000 }
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao pedir sugestão");
    } finally {
      setSuggestingTitle(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#E6C2C7] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flora-text-primary flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-[#B24C63]" />
            Configurações da história
          </DialogTitle>
          <DialogDescription className="flora-text-secondary">
            Edite o título, descrição, gênero, tom e status. Você pode mudar quantas vezes quiser — histórias evoluem 🌸
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Título */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flora-text-primary">Título *</Label>
              <button
                onClick={handleSuggestTitle}
                disabled={suggestingTitle}
                className="text-xs text-[#B24C63] hover:text-[#8B3550] flex items-center gap-1 disabled:opacity-50"
              >
                {suggestingTitle ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Pedindo à Flora...</>
                ) : (
                  <><Sparkle className="w-3 h-3" /> Pedir sugestão à Flora</>
                )}
              </button>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: O Jardim das Memórias Perdidas"
              maxLength={120}
              className="border-[#E6C2C7] focus:border-[#C48D9E] text-base font-medium"
            />
            <p className="text-xs flora-text-secondary">
              {title.length}/120 caracteres · Sem ideias? Peça uma sugestão à Flora 🌸
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="flora-text-primary">Descrição / Sinopse</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve sinopse da história..."
              rows={3}
              maxLength={500}
              className="border-[#E6C2C7] focus:border-[#C48D9E] resize-none"
            />
            <p className="text-xs flora-text-secondary">{description.length}/500 caracteres</p>
          </div>

          {/* Gênero + Tom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flora-text-primary">Gênero</Label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Realismo mágico"
                list="genre-suggestions"
                className="border-[#E6C2C7] focus:border-[#C48D9E]"
              />
              <datalist id="genre-suggestions">
                {GENRE_SUGGESTIONS.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label className="flora-text-primary">Tom</Label>
              <Input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Melancólico, esperançoso"
                list="tone-suggestions"
                className="border-[#E6C2C7] focus:border-[#C48D9E]"
              />
              <datalist id="tone-suggestions">
                {TONE_SUGGESTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="flora-text-primary">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white border-[#E6C2C7] focus:border-[#C48D9E]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flora-gradient-accent text-white"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</>
            ) : (
              <><Check className="w-4 h-4 mr-1" /> Salvar alterações</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
