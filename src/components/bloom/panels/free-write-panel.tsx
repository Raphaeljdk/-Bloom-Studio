"use client";

import { useState, useEffect, useRef } from "react";
import { Pen, Sparkles, Clock, Trash2, Save } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { useStoryDetail } from "@/hooks/use-stories";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props { storyId: string }

const STORAGE_KEY = "bloom-free-write";

export function FreeWritePanel({ storyId }: Props) {
  const { data: story } = useStoryDetail(storyId);
  const key = `${STORAGE_KEY}-${storyId}`;

  // Lazy initial state — lê do localStorage uma vez
  const [content, setContent] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(key) || "";
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save com debounce de 3s
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, content);
        setLastSaved(new Date());
      }
    }, 3000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [content, key]);

  const words = content.split(/\s+/).filter(Boolean).length;
  const chars = content.length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const handleClear = () => {
    if (!confirm("Limpar toda a escrita livre? Esta ação não pode ser desfeita.")) return;
    setContent("");
    localStorage.removeItem(key);
    toast.info("Escrita livre limpa");
  };

  const handleSendToChapter = () => {
    if (!content.trim()) {
      toast.error("Nada para enviar");
      return;
    }
    // Copia para o clipboard para o usuário colar no capítulo
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Texto copiado! Cole no capítulo desejado 🌸");
    }).catch(() => {
      toast.error("Erro ao copiar");
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-bold flora-text-primary flex items-center gap-2 mb-1">
          <Pen className="w-5 h-5" />
          Escrita livre
        </h2>
        <p className="text-sm flora-text-secondary">
          Espaço sem estrutura para brainstorm, cenas soltas, diálogos, ideias. Salvo automaticamente no seu navegador.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1 flora-text-secondary">
          <Pen className="w-3.5 h-3.5" />
          <strong className="flora-text-primary">{words}</strong> palavras
        </span>
        <span className="flora-text-secondary">
          <strong className="flora-text-primary">{chars}</strong> caracteres
        </span>
        <span className="flex items-center gap-1 flora-text-secondary">
          <Clock className="w-3.5 h-3.5" />
          ~{readTime} min leitura
        </span>
        {lastSaved && (
          <span className="flex items-center gap-1 text-[#7EB8A2] ml-auto">
            <Save className="w-3.5 h-3.5" />
            Salvo às {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Editor livre */}
      <div className="bg-white rounded-2xl flora-shadow-soft flora-border border p-1">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Escreva livremente aqui...

• Cenas que vieram à cabeça
• Diálogos soltos
• Descrições de lugares
• Monólogo interior de personagem
• Ideias para plot twists
• Qualquer coisa — sem julgamento, sem estrutura

A Flora pode ajudar se você pedir no chat →`}
          className="w-full min-h-[60vh] bg-transparent border-0 focus:outline-none resize-none p-6 text-base leading-relaxed flora-text-primary font-serif"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        />
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <div className="flex items-center gap-2 text-xs flora-text-secondary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dica: peça à Flora "analise minha escrita livre" no chat</span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSendToChapter}
            variant="outline"
            size="sm"
            className="border-[#C48D9E] text-[#B24C63] hover:bg-[#FADADD]"
            disabled={!content.trim()}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Copiar para capítulo
          </Button>
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className="text-[#D4818B] hover:bg-[#FADADD]"
            disabled={!content.trim()}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
