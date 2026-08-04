"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, RotateCcw, Coffee, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoryStore } from "@/stores/story-store";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  storyId: string;
}

type Phase = "writing" | "break";
type Ambient = "none" | "rain" | "forest" | "cafe" | "silence";

const AMBIENTS: { id: Ambient; label: string; emoji: string }[] = [
  { id: "none", label: "Silêncio", emoji: "🤫" },
  { id: "rain", label: "Chuva suave", emoji: "🌧️" },
  { id: "forest", label: "Floresta", emoji: "🌲" },
  { id: "cafe", label: "Cafeteria", emoji: "☕" },
  { id: "silence", label: "Lareira", emoji: "🔥" },
];

const WRITING_MINUTES = 25;
const BREAK_MINUTES = 5;

export function FocusMode({ open, onClose, storyId }: Props) {
  const data = useStoryStore((s) => s.currentStory);
  const setSection = useUIStore((s) => s.setSection);
  const setCurrentChapter = useUIStore((s) => s.setCurrentChapter);

  const [phase, setPhase] = useState<Phase>("writing");
  const [secondsLeft, setSecondsLeft] = useState(WRITING_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [ambient, setAmbient] = useState<Ambient>("none");
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [wordGoal] = useState(500);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Capítulo atual para escrita — deriva do primeiro capítulo disponível
  // Usa key-based remount via storyId para resetar estado quando muda de história
  const firstChapterWithContent = data?.chapters[0];

  // Estado local — inicializado com o primeiro capítulo se disponível
  // Quando o usuário troca de capítulo no select, atualiza normalmente
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [localContent, setLocalContent] = useState("");

  // Deriva o capítulo atual: preferência do usuário, senão o primeiro disponível
  const currentChapterId = selectedChapterId ?? firstChapterWithContent?.id ?? null;
  const currentChapter = data?.chapters.find((c) => c.id === currentChapterId);
  // Conteúdo exibido: se o usuário editou, usa localContent; senão usa o do capítulo
  const chapterContent = currentChapterId === selectedChapterId ? localContent : (currentChapter?.content ?? "");
  const setChapterContent = (text: string) => {
    setSelectedChapterId(currentChapterId);
    setLocalContent(text);
  };
  const setChapterId = (id: string) => {
    const ch = data?.chapters.find((c) => c.id === id);
    setSelectedChapterId(id);
    setLocalContent(ch?.content ?? "");
  };

  // Timer
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Fase acabou
          if (phase === "writing") {
            setCompletedPomodoros((p) => p + 1);
            setPhase("break");
            toast.success("Pomodoro concluído! 🌸 Hora da pausa.");
            return BREAK_MINUTES * 60;
          } else {
            setPhase("writing");
            toast.info("Pausa acabou! Voltando à escrita ✍️");
            return WRITING_MINUTES * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progress = phase === "writing"
    ? ((WRITING_MINUTES * 60 - secondsLeft) / (WRITING_MINUTES * 60)) * 100
    : ((BREAK_MINUTES * 60 - secondsLeft) / (BREAK_MINUTES * 60)) * 100;

  const currentWords = chapterContent.split(/\s+/).filter(Boolean).length;
  const wordProgress = Math.min(100, (currentWords / wordGoal) * 100);

  const reset = () => {
    setRunning(false);
    setPhase("writing");
    setSecondsLeft(WRITING_MINUTES * 60);
  };

  // Auto-save do capítulo (debounce 2s) — só salva se o usuário editou
  useEffect(() => {
    if (!currentChapterId || !localContent) return;
    const t = setTimeout(async () => {
      try {
        await fetch(`/api/stories/${storyId}/chapters/${currentChapterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: localContent }),
        });
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [localContent, currentChapterId, storyId]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#1A0F16] text-[#FDF2F0] flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌸</span>
            <div>
              <h1 className="font-semibold">Modo Foco</h1>
              <p className="text-xs text-white/60">
                {phase === "writing" ? "✍️ Escrevendo" : "☕ Pausa"} · {completedPomodoros} pomodoro{completedPomodoros === 1 ? "" : "s"} hoje
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Seletor de som ambiente */}
            <div className="hidden sm:flex items-center gap-1 mr-2">
              {AMBIENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAmbient(a.id)}
                  className={`text-lg p-1.5 rounded-lg transition ${
                    ambient === a.id ? "bg-white/20" : "hover:bg-white/10 opacity-60"
                  }`}
                  title={a.label}
                >
                  {a.emoji}
                </button>
              ))}
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15"
            >
              <X className="w-4 h-4 mr-1" />
              Sair
            </Button>
          </div>
        </div>

        {/* Timer circular */}
        <div className="flex flex-col items-center justify-center py-6 sm:py-8">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100" cy="100" r="90"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="100" cy="100" r="90"
                fill="none"
                stroke={phase === "writing" ? "#D4818B" : "#7EB8A2"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums">{timeStr}</span>
              <span className="text-xs text-white/60 mt-1">
                {phase === "writing" ? "Escrevendo" : "Pausa"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={() => setRunning(!running)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15"
            >
              {running ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
              {running ? "Pausar" : "Iniciar"}
            </Button>
            <Button
              onClick={reset}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Resetar
            </Button>
          </div>
        </div>

        {/* Meta de palavras */}
        <div className="px-6 sm:px-12 mb-4">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span>Meta de palavras: {currentWords} / {wordGoal}</span>
            <span>{Math.round(wordProgress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D4818B] to-[#B24C63] transition-all duration-500"
              style={{ width: `${wordProgress}%` }}
            />
          </div>
        </div>

        {/* Editor minimalista */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-12 pb-12">
          {data?.chapters && data.chapters.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-3 max-w-3xl mx-auto">
                <Pen className="w-4 h-4 text-white/40" />
                <select
                  value={currentChapterId || ""}
                  onChange={(e) => {
                    const ch = data.chapters.find((c) => c.id === e.target.value);
                    if (ch) setChapterId(ch.id);
                  }}
                  className="bg-transparent text-white/80 text-sm border-0 focus:outline-none cursor-pointer"
                >
                  {data.chapters.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#2A1A22]">
                      Cap. {c.number}{c.title ? ` — ${c.title}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
                placeholder="Escreva freely... sem distrações, apenas você e a história 🌸"
                className="w-full max-w-3xl mx-auto bg-transparent text-white text-lg leading-relaxed font-serif resize-none focus:outline-none min-h-[40vh] block"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              />
              <p className="text-xs text-white/40 mt-4 max-w-3xl mx-auto">
                Salvamento automático · {currentWords} palavras
              </p>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-white/60 mb-3">Crie um capítulo primeiro para usar o Modo Foco</p>
              <Button
                onClick={() => {
                  onClose();
                  setSection("chapters");
                }}
                className="flora-gradient-accent text-white"
              >
                Ir para Capítulos
              </Button>
            </div>
          )}
        </div>

        {/* Som ambiente info */}
        {ambient !== "none" && (
          <div className="absolute bottom-4 right-4 text-xs text-white/40 flex items-center gap-1">
            <span>{AMBIENTS.find((a) => a.id === ambient)?.emoji}</span>
            <span>{AMBIENTS.find((a) => a.id === ambient)?.label}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
