"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pen, Sparkles, Clock, Trash2, Save, Wand2, Loader2 } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { useStoryDetail } from "@/hooks/use-stories";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props { storyId: string }

const STORAGE_KEY = "bloom-free-write";

export function FreeWritePanel({ storyId }: Props) {
  const { data: story } = useStoryDetail(storyId);
  const qc = useQueryClient();
  const key = `${STORAGE_KEY}-${storyId}`;

  // Lazy initial state — lê do localStorage uma vez
  const [content, setContent] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(key) || "";
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [organizing, setOrganizing] = useState(false);

  // Auto-save com debounce de 3s
  const saveTimer = useTimer(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, content);
      setLastSaved(new Date());
    }
  }, 3000);

  useEffect(() => {
    saveTimer(content);
  }, [content, saveTimer]);

  const words = content.split(/\s+/).filter(Boolean).length;
  const chars = content.length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const handleClear = () => {
    if (!confirm("Limpar toda a escrita livre? Esta ação não pode ser desfeita.")) return;
    setContent("");
    localStorage.removeItem(key);
    toast.info("Escrita livre limpa");
  };

  const handleCopyToChapter = () => {
    if (!content.trim()) {
      toast.error("Nada para copiar");
      return;
    }
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Texto copiado! Cole no capítulo desejado 🌸");
    }).catch(() => {
      toast.error("Erro ao copiar");
    });
  };

  const organizeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/stories/${storyId}/organize-free-write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.summary, { duration: 6000 });
      // Invalida tudo para recarregar a sidebar com as novas entidades
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro ao organizar escrita livre");
    },
    onSettled: () => setOrganizing(false),
  });

  const handleOrganize = () => {
    if (!content.trim()) {
      toast.error("Escreva algo primeiro");
      return;
    }
    if (content.trim().length < 50) {
      toast.error("Escreva pelo menos 50 caracteres para organizar");
      return;
    }
    setOrganizing(true);
    organizeMutation.mutate(content);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-bold flora-text-primary flex items-center gap-2 mb-1">
          <Pen className="w-5 h-5" />
          Escrita livre
        </h2>
        <p className="text-sm flora-text-secondary">
          Espaço sem estrutura para brainstorm, cenas soltas, diálogos, ideias. Salvo automaticamente. Quando pronto, clique em <strong>Organizar na história</strong> e a Flora vai extrair personagens, capítulos, eventos e mais.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-3 text-xs flex-wrap">
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

Quando terminar, clique em "Organizar na história" abaixo e a Flora vai separar tudo:
- Personagens → painel Personagens
- Cenas → painel Capítulos
- Acontecimentos → painel Cronologia
- Momentos cruciais → painel Acontecimentos
- Ideias/perguntas → painel Anotações`}
          className="w-full min-h-[50vh] bg-transparent border-0 focus:outline-none resize-none p-6 text-base leading-relaxed flora-text-primary font-serif"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        />
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <div className="flex items-center gap-2 text-xs flora-text-secondary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>A Flora vai organizar seu texto automaticamente</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleOrganize}
            disabled={organizing || !content.trim() || content.trim().length < 50}
            className="flora-gradient-accent text-white"
            size="sm"
          >
            {organizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Organizando...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                Organizar na história
              </>
            )}
          </Button>
          <Button
            onClick={handleCopyToChapter}
            variant="outline"
            size="sm"
            className="border-[#C48D9E] text-[#B24C63] hover:bg-[#FADADD]"
            disabled={!content.trim()}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Copiar
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

      {/* Info panel */}
      <div className="mt-4 bg-[#FADADD] rounded-xl p-4 flora-border border">
        <p className="text-xs flora-text-primary leading-relaxed">
          <strong>🌸 Como funciona a organização:</strong> A Flora lê seu texto livre e identifica
          personagens, cenas que viram capítulos, eventos cronológicos, momentos importantes e anotações.
          Tudo é adicionado automaticamente nos painéis da sidebar — você só precisa revisar e editar.
        </p>
      </div>
    </div>
  );
}

// Hook customizado para timer com cleanup
import { useEffect, useRef, useCallback } from "react";
function useTimer(callback: () => void, delay: number) {
  const savedCallback = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const trigger = useCallback((..._args: unknown[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => savedCallback.current(), delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return trigger;
}
