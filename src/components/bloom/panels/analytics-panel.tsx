"use client";

import { useMemo } from "react";
import { BarChart3, Clock, BookOpen, Repeat, TrendingUp, Zap } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { useStoryDetail } from "@/hooks/use-stories";

interface Props { storyId: string }

const CHAPTER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  WRITING: "Escrevendo",
  REVISION: "Revisão",
  COMPLETED: "Concluído",
};

/** Conta palavras em um texto */
function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** Estima tempo de leitura em minutos (~200 palavras/min) */
function readingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}

/** Calcula índice de legibilidade simplificado (baseado em tamanho médio de palavras e frases) */
function readabilityScore(text: string | null | undefined): { score: number; label: string } {
  if (!text || text.trim().length === 0) return { score: 0, label: "—" };
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { score: 0, label: "—" };
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(1, sentences.length);
  const avgCharsPerWord = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Fórmula simplificada: quanto menor avgWordsPerSentence e avgCharsPerWord, mais legível
  const score = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 12) * 3 - (avgCharsPerWord - 5) * 5));

  let label = "Fácil";
  if (score < 40) label = "Difícil";
  else if (score < 60) label = "Médio";
  else if (score < 80) label = "Bom";
  return { score: Math.round(score), label };
}

/** Encontra palavras repetidas (saidismos / palavras mais usadas) */
function findRepeatedWords(text: string | null | undefined, minLen = 5, topN = 10): Array<{ word: string; count: number }> {
  if (!text) return [];
  const stopWords = new Set([
    "de", "da", "do", "das", "dos", "que", "uma", "um", "para", "com", "sem",
    "por", "como", "mais", "mas", "quando", "então", "se", "ao", "aos", "à",
    "na", "no", "nas", "nos", "em", "entre", "após", "antes", "depois",
    "era", "foi", "ser", "estar", "ter", "haver", "aqui", "ali", "lá", "já",
    "não", "sim", "também", "ainda", "muito", "pouco", "tudo", "nada",
    "sua", "seu", "suas", "seus", "minha", "meu", "minhas", "meus",
    "this", "that", "with", "from", "have", "been",
  ]);

  const counts: Record<string, number> = {};
  const words = text.toLowerCase().match(/[\p{L}]+/gu) || [];
  for (const w of words) {
    if (w.length < minLen) continue;
    if (stopWords.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([word, count]) => ({ word, count }))
    .filter((x) => x.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function AnalyticsPanel({ storyId }: Props) {
  const { data: story } = useStoryDetail(storyId);
  const data = useStoryStore((s) => s.currentStory);

  const analytics = useMemo(() => {
    if (!story || !data) return null;
    const chapters = data.chapters;
    const totalWords = chapters.reduce((sum, c) => sum + countWords(c.content), 0);
    const wordsPerChapter = chapters.map((c) => ({
      number: c.number,
      title: c.title || `Cap. ${c.number}`,
      words: countWords(c.content),
      status: c.status,
    }));
    const allContent = chapters.map((c) => c.content || "").join("\n\n");
    const repeated = findRepeatedWords(allContent);
    const readability = readabilityScore(allContent);
    const readTime = readingTime(totalWords);
    const avgWordsPerChapter = chapters.length > 0 ? Math.round(totalWords / chapters.length) : 0;
    const completed = chapters.filter((c) => c.status === "COMPLETED").length;
    const writing = chapters.filter((c) => c.status === "WRITING").length;
    const draft = chapters.filter((c) => c.status === "DRAFT").length;

    return {
      totalWords,
      wordsPerChapter,
      repeated,
      readability,
      readTime,
      avgWordsPerChapter,
      completed,
      writing,
      draft,
      totalChapters: chapters.length,
      characters: data.characters.length,
      events: data.events.filter((e) => e.isApproved).length,
    };
  }, [story, data]);

  if (!analytics) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-5xl flora-petal-float">🌸</div>
      </div>
    );
  }

  const maxWords = Math.max(...analytics.wordsPerChapter.map((w) => w.words), 1);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold flora-text-primary flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" />
          Analytics da história
        </h2>
        <p className="text-sm flora-text-secondary">
          Estatísticas e insights para melhorar sua escrita
        </p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Palavras"
          value={analytics.totalWords.toLocaleString("pt-BR")}
          sub={`média ${analytics.avgWordsPerChapter}/cap`}
          color="rose"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Tempo leitura"
          value={`${analytics.readTime} min`}
          sub="200 pal/min"
          color="sage"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Legibilidade"
          value={`${analytics.readability.score}`}
          sub={analytics.readability.label}
          color={analytics.readability.score >= 60 ? "sage" : analytics.readability.score >= 40 ? "gold" : "rose"}
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Capítulos"
          value={String(analytics.totalChapters)}
          sub={`${analytics.completed} ✓ · ${analytics.writing} ✍ · ${analytics.draft} ○`}
          color="gold"
        />
      </div>

      {/* Gráfico de palavras por capítulo (ritmo) */}
      {analytics.wordsPerChapter.length > 0 && (
        <div className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6 mb-6">
          <h3 className="font-bold flora-text-primary mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Ritmo por capítulo
          </h3>
          <p className="text-xs flora-text-secondary mb-4">
            Distribuição de palavras — picos indicam capítulos mais densos
          </p>
          <div className="space-y-2">
            {analytics.wordsPerChapter.map((ch) => (
              <div key={ch.number} className="flex items-center gap-2">
                <span className="text-xs flora-text-secondary w-12 flex-shrink-0 truncate">
                  Cap. {ch.number}
                </span>
                <div className="flex-1 h-6 bg-[#FDF2F0] rounded-lg overflow-hidden relative">
                  <div
                    className="h-full flora-gradient-accent transition-all duration-500"
                    style={{ width: `${(ch.words / maxWords) * 100}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium flora-text-primary">
                    {ch.words}
                  </span>
                </div>
                <span className="text-xs flora-text-secondary w-20 flex-shrink-0 hidden sm:inline">
                  {CHAPTER_STATUS_LABELS[ch.status] || ch.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Palavras repetidas */}
      {analytics.repeated.length > 0 && (
        <div className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6 mb-6">
          <h3 className="font-bold flora-text-primary mb-1 flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            Palavras mais repetidas
          </h3>
          <p className="text-xs flora-text-secondary mb-4">
            Possíveis saidismos ou palavras viciadas — considere sinônimos
          </p>
          <div className="flex flex-wrap gap-2">
            {analytics.repeated.map((r) => (
              <span
                key={r.word}
                className="text-xs px-3 py-1.5 rounded-full bg-[#FADADD] text-[#B24C63] font-medium"
              >
                {r.word} <span className="opacity-60">×{r.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {analytics.totalWords === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full flora-gradient-soft mb-4">
            <BarChart3 className="w-7 h-7 text-[#C48D9E]" />
          </div>
          <h3 className="font-bold flora-text-primary mb-1">Sem dados ainda</h3>
          <p className="text-sm flora-text-secondary max-w-md mx-auto">
            Escreva conteúdo nos capítulos para ver analytics: ritmo, legibilidade,
            palavras repetidas e mais.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "rose" | "sage" | "gold";
}) {
  const colors = {
    rose: { bg: "bg-[#FADADD]", icon: "text-[#B24C63]", value: "text-[#B24C63]", accent: "text-[#8B6B7A]" },
    sage: { bg: "bg-[#D4E8DC]", icon: "text-[#5A8870]", value: "text-[#5A8870]", accent: "text-[#6B8A7A]" },
    gold: { bg: "bg-[#F4E4BC]", icon: "text-[#8B6B3A]", value: "text-[#8B6B3A]", accent: "text-[#8B7A4A]" },
  };
  const c = colors[color];
  return (
    <div className={`${c.bg} rounded-2xl p-3 sm:p-4 flora-border border`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-wider font-medium text-[#8B6B7A]">{label}</p>
        <span className={c.icon}>{icon}</span>
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${c.value}`}>{value}</p>
      <p className={`text-xs ${c.accent} mt-0.5`}>{sub}</p>
    </div>
  );
}
