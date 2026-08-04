"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, BookOpenCheck, Download, RefreshCw, Trash2, Check, FileText, Printer, FileType, Braces, FileCode } from "lucide-react";
import { useStoryDetail } from "@/hooks/use-stories";
import { useStoryStore } from "@/stores/story-store";
import { api } from "@/lib/api-client";
import { exportMarkdown, exportHTML, exportPDF, exportTXT, exportJSON } from "@/lib/export-utils";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props { storyId: string }

const COVER_STYLES = [
  { value: "watercolor", label: "🎨 Aquarela", desc: "Suave, etéreo, pinceladas delicadas" },
  { value: "digital", label: "💻 Digital Art", desc: "Vibrante, conceitual, detalhado" },
  { value: "photographic", label: "📸 Fotográfico", desc: "Cinematográfico, realista" },
  { value: "minimalist", label: "⬜ Minimalista", desc: "Simples, elegante, negativo" },
  { value: "vintage", label: "📜 Vintage", desc: "Retrô, clássico, ornamentado" },
  { value: "fantasy", label: "🐉 Fantasia", desc: "Épico, mágico, pintura" },
];

export function FinalizePanel({ storyId }: Props) {
  const { data: story } = useStoryDetail(storyId);
  const data = useStoryStore((s) => s.currentStory);
  const qc = useQueryClient();
  const [coverStyle, setCoverStyle] = useState(story?.coverStyle || "watercolor");
  const [generating, setGenerating] = useState(false);

  const generateCoverMutation = useMutation({
    mutationFn: (style: string) => api.generateCover(storyId, style),
    onSuccess: (result) => {
      toast.success(`Capa gerada no estilo ${result.styleLabel} 🌸`);
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeCoverMutation = useMutation({
    mutationFn: () => api.removeCover(storyId),
    onSuccess: () => {
      toast.info("Capa removida");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: () => api.updateStory(storyId, { status: "COMPLETED" }),
    onSuccess: () => {
      toast.success("🎉 História finalizada! Você pode baixá-la nos formatos abaixo.");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
  });

  const handleGenerateCover = async () => {
    setGenerating(true);
    try {
      await generateCoverMutation.mutateAsync(coverStyle);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (format: "pdf" | "md" | "html" | "txt" | "json") => {
    if (!story) return;
    // Constrói o objeto completo para exportação (inclui coverUrl para PDF)
    const storyData = {
      title: story.title,
      description: story.description,
      status: story.status,
      genre: story.genre,
      tone: story.tone,
      coverUrl: story.coverUrl || null,
      characters: data?.characters || [],
      chapters: data?.chapters || [],
      timeline: data?.timeline || [],
      events: (data?.events || []).filter((e) => e.isApproved),
      annotations: data?.annotations || [],
    };
    try {
      if (format === "pdf") { exportPDF(storyData); toast.success("Abrindo PDF para impressão 🌸"); }
      else if (format === "md") { exportMarkdown(storyData); toast.success("Markdown baixado 🌸"); }
      else if (format === "html") { exportHTML(storyData); toast.success("HTML baixado 🌸"); }
      else if (format === "txt") { exportTXT(storyData); toast.success("Texto baixado 🌸"); }
      else if (format === "json") { exportJSON(storyData); toast.success("Backup JSON baixado 🌸"); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    }
  };

  const coverUrl = story?.coverUrl;
  const isCompleted = story?.status === "COMPLETED";

  // Estatísticas para o resumo de finalização
  const totalWords = (data?.chapters || []).reduce((sum, c) => {
    return sum + (c.content || "").split(/\s+/).filter(Boolean).length;
  }, 0);
  const totalChapters = data?.chapters.length || 0;
  const completedChapters = (data?.chapters || []).filter((c) => c.status === "COMPLETED").length;
  const totalCharacters = data?.characters.length || 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold flora-text-primary flex items-center gap-2 mb-1">
          <BookOpenCheck className="w-5 h-5" />
          Finalizar história
        </h2>
        <p className="text-sm flora-text-secondary">
          Gere uma capa, marque como concluída e baixe sua história nos formatos disponíveis
        </p>
      </div>

      {/* Capa da história */}
      <section className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6 mb-6">
        <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B24C63]" />
          Capa da história
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preview da capa */}
          <div className="flex flex-col items-center">
            <div className="w-48 h-72 rounded-xl overflow-hidden flora-border border flora-shadow-soft bg-[#FADADD] flex items-center justify-center relative">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={`Capa de ${story?.title}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4">
                  <div className="text-5xl mb-2">📖</div>
                  <p className="text-xs flora-text-secondary">
                    Nenhuma capa gerada ainda
                  </p>
                </div>
              )}
              {coverUrl && (
                <button
                  onClick={() => removeCoverMutation.mutate()}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-[#B24C63] p-1.5 rounded-full transition"
                  title="Remover capa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {coverUrl && (
              <p className="text-xs flora-text-secondary mt-2">
                Capa gerada no estilo: {COVER_STYLES.find((s) => s.value === story?.coverStyle)?.label || story?.coverStyle}
              </p>
            )}
          </div>

          {/* Controles de geração */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium flora-text-secondary uppercase tracking-wider mb-1.5 block">
                Estilo da capa
              </label>
              <Select value={coverStyle} onValueChange={setCoverStyle}>
                <SelectTrigger className="bg-white border-[#E6C2C7]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVER_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs flora-text-secondary mt-1.5 italic">
                {COVER_STYLES.find((s) => s.value === coverStyle)?.desc}
              </p>
            </div>

            <Button
              onClick={handleGenerateCover}
              disabled={generating}
              className="w-full flora-gradient-accent text-white"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Gerando capa... (~10s)
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {coverUrl ? "Gerar nova capa" : "Gerar capa com IA"}
                </>
              )}
            </Button>

            <div className="bg-[#FDF2F0] rounded-xl p-3 text-xs flora-text-secondary">
              <p className="font-medium flora-text-primary mb-1">💡 Como funciona:</p>
              <p>A IA usa o título, descrição, gênero e tom da sua história para criar uma capa única. Pode levar ~10 segundos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Resumo da história */}
      <section className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6 mb-6">
        <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#B24C63]" />
          Resumo da história
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#FADADD] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#B24C63]">{totalWords.toLocaleString("pt-BR")}</p>
            <p className="text-xs flora-text-secondary">palavras</p>
          </div>
          <div className="bg-[#D4E8DC] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#5A8870]">{completedChapters}/{totalChapters}</p>
            <p className="text-xs flora-text-secondary">capítulos ✓</p>
          </div>
          <div className="bg-[#F4E4BC] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#8B6B3A]">{totalCharacters}</p>
            <p className="text-xs flora-text-secondary">personagens</p>
          </div>
          <div className="bg-[#E6C2C7] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#4A2C3A]">{(data?.events || []).filter((e) => e.isApproved).length}</p>
            <p className="text-xs flora-text-secondary">acontecimentos</p>
          </div>
        </div>
      </section>

      {/* Finalizar */}
      <section className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6 mb-6">
        <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-[#B24C63]" />
          Status da história
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className={`flex-1 px-4 py-3 rounded-xl ${
            isCompleted
              ? "bg-[#D4E8DC] text-[#5A8870]"
              : "bg-[#FADADD] text-[#B24C63]"
          }`}>
            <p className="font-medium">
              {isCompleted ? "✅ História concluída!" : "📝 Em andamento"}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {isCompleted
                ? "Sua história está marcada como finalizada. Você ainda pode editá-la e exportá-la."
                : "Quando terminar de escrever, marque a história como concluída."}
            </p>
          </div>
          {!isCompleted && (
            <Button
              onClick={() => markCompleteMutation.mutate()}
              disabled={markCompleteMutation.isPending || totalChapters === 0}
              className="bg-[#7EB8A2] text-white hover:bg-[#6BA890] flex-shrink-0"
            >
              <Check className="w-4 h-4 mr-1" />
              Marcar como concluída
            </Button>
          )}
        </div>
        {totalChapters === 0 && (
          <p className="text-xs flora-text-secondary mt-2 italic">
            ⚠️ Crie pelo menos um capítulo antes de finalizar.
          </p>
        )}
      </section>

      {/* Exportação */}
      <section className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6">
        <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-[#B24C63]" />
          Baixar história
        </h3>
        <p className="text-sm flora-text-secondary mb-4">
          Escolha o formato para baixar sua história completa.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExportButton
            onClick={() => handleExport("pdf")}
            icon={<Printer className="w-5 h-5" />}
            title="PDF / Imprimir"
            desc="Pronto para impressão com capa"
            highlight
          />
          <ExportButton
            onClick={() => handleExport("md")}
            icon={<FileText className="w-5 h-5" />}
            title="Markdown (.md)"
            desc="Importar em editores"
          />
          <ExportButton
            onClick={() => handleExport("html")}
            icon={<FileCode className="w-5 h-5" />}
            title="HTML"
            desc="Página web standalone"
          />
          <ExportButton
            onClick={() => handleExport("txt")}
            icon={<FileType className="w-5 h-5" />}
            title="Texto (.txt)"
            desc="Puro e simples"
          />
          <ExportButton
            onClick={() => handleExport("json")}
            icon={<Braces className="w-5 h-5" />}
            title="Backup JSON"
            desc="Backup completo da história"
          />
        </div>
      </section>
    </div>
  );
}

function ExportButton({
  onClick,
  icon,
  title,
  desc,
  highlight,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border transition text-left ${
        highlight
          ? "flora-gradient-accent text-white border-transparent hover:opacity-90 flora-shadow-soft"
          : "bg-[#FDF2F0] border-[#E6C2C7] hover:bg-[#FADADD] flora-text-primary"
      }`}
    >
      <span className={highlight ? "text-white" : "text-[#B24C63]"}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className={`text-xs ${highlight ? "text-white/80" : "flora-text-secondary"}`}>{desc}</p>
      </div>
      <Download className={`w-4 h-4 ${highlight ? "text-white" : "text-[#8B6B7A]"}`} />
    </button>
  );
}
