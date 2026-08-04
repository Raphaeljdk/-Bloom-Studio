"use client";

import { useMemo } from "react";
import { FileText, Printer, Download } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { useStoryDetail } from "@/hooks/use-stories";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props { storyId: string }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em progresso",
  COMPLETED: "Concluída",
  ON_HOLD: "Pausada",
};

const CHAPTER_STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  WRITING: "Escrevendo",
  REVISION: "Revisão",
  COMPLETED: "Concluído",
};

const CATEGORY_LABELS: Record<string, string> = {
  IDEA: "💡 Ideias",
  QUESTION: "❓ Perguntas",
  DECISION: "🚩 Decisões",
  OBSERVATION: "👁️ Observações",
};

export function DocumentPanel({ storyId }: Props) {
  const { data: story } = useStoryDetail(storyId);
  const data = useStoryStore((s) => s.currentStory);
  const setSection = useUIStore((s) => s.setSection);

  const doc = useMemo(() => {
    if (!story || !data) return null;
    return {
      title: story.title,
      description: story.description,
      status: story.status,
      genre: story.genre,
      tone: story.tone,
      characters: data.characters,
      chapters: data.chapters,
      timeline: data.timeline,
      events: data.events.filter((e) => e.isApproved),
      annotations: data.annotations,
    };
  }, [story, data]);

  // Estatísticas do documento
  const stats = useMemo(() => {
    if (!doc) return null;
    const totalWords = doc.chapters.reduce((sum, c) => {
      const words = (c.content || "").split(/\s+/).filter(Boolean).length;
      return sum + words;
    }, 0);
    const totalChapters = doc.chapters.length;
    const completedChapters = doc.chapters.filter((c) => c.status === "COMPLETED").length;
    const writingChapters = doc.chapters.filter((c) => c.status === "WRITING").length;
    return {
      totalWords,
      totalChapters,
      completedChapters,
      writingChapters,
      characters: doc.characters.length,
      timeline: doc.timeline.length,
      events: doc.events.length,
      annotations: doc.annotations.length,
    };
  }, [doc]);

  const handlePrint = () => {
    if (!doc) return;
    const html = generatePrintHTML(doc);
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      toast.error("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleExport = async () => {
    try {
      const result = await api.exportMarkdown(storyId);
      const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Documento exportado como Markdown 🌸");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    }
  };

  if (!doc) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-5xl flora-petal-float">🌸</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm flora-text-secondary flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          Documento organizado da história
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="border-[#C48D9E] text-[#B24C63] hover:bg-[#FADADD]"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Markdown
          </Button>
          <Button
            onClick={handlePrint}
            size="sm"
            className="flora-gradient-accent text-white"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Stats banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Palavras"
            value={stats.totalWords.toLocaleString("pt-BR")}
            sub="no total"
            color="rose"
          />
          <StatCard
            label="Capítulos"
            value={String(stats.totalChapters)}
            sub={`${stats.completedChapters} concluído${stats.completedChapters === 1 ? "" : "s"} · ${stats.writingChapters} escrevendo`}
            color="sage"
          />
          <StatCard
            label="Personagens"
            value={String(stats.characters)}
            sub="criados"
            color="gold"
          />
          <StatCard
            label="Acontecimentos"
            value={String(stats.events)}
            sub="aprovados"
            color="rose"
          />
        </div>
      )}

      {/* Document */}
      <article className="bg-white rounded-2xl flora-shadow-soft flora-border border p-8 md:p-12" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {/* Title page */}
        <header className="text-center mb-10 pb-8 border-b border-[#E6C2C7]">
          <div className="text-3xl mb-3">🌸</div>
          <h1 className="text-3xl md:text-4xl font-bold flora-text-primary mb-3 leading-tight">
            {doc.title}
          </h1>
          {doc.description && (
            <p className="text-base flora-text-secondary italic max-w-2xl mx-auto leading-relaxed">
              {doc.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap text-xs">
            <span className="px-3 py-1 rounded-full bg-[#FADADD] text-[#B24C63] font-medium">
              {STATUS_LABELS[doc.status] || doc.status}
            </span>
            {doc.genre && (
              <span className="px-3 py-1 rounded-full bg-[#E6C2C7] text-[#4A2C3A]">
                {doc.genre}
              </span>
            )}
            {doc.tone && (
              <span className="px-3 py-1 rounded-full bg-[#E6C2C7] text-[#4A2C3A]">
                Tom: {doc.tone}
              </span>
            )}
          </div>
        </header>

        {/* Personagens */}
        <Section title="Personagens" emoji="🎭">
          {doc.characters.length === 0 ? (
            <Empty text="Nenhum personagem cadastrado." />
          ) : (
            <div className="space-y-4">
              {doc.characters.map((c, i) => (
                <div key={c.id} className="pl-4 border-l-2 border-[#D4818B]">
                  <h3 className="font-bold flora-text-primary text-lg">
                    {i + 1}. {c.name}
                    {c.role && (
                      <span className="text-sm flora-text-secondary italic ml-2">— {c.role}</span>
                    )}
                  </h3>
                  {c.description && (
                    <p className="text-sm flora-text-primary mt-1 leading-relaxed">{c.description}</p>
                  )}
                  {c.traits && (
                    <p className="text-xs flora-text-secondary mt-1 italic">
                      Traços: {c.traits}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Cronologia */}
        <Section title="Cronologia" emoji="📅">
          {doc.timeline.length === 0 ? (
            <Empty text="Sem eventos cronológicos." />
          ) : (
            <ol className="space-y-2">
              {doc.timeline.map((t, i) => (
                <li key={t.id} className="flex gap-3">
                  <span className="font-bold text-[#B24C63] flex-shrink-0">{i + 1}.</span>
                  <div>
                    <span className="font-bold flora-text-primary">{t.title}</span>
                    {t.date && (
                      <span className="text-sm flora-text-secondary italic ml-2">({t.date})</span>
                    )}
                    {t.description && (
                      <p className="text-sm flora-text-secondary mt-0.5">{t.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* Capítulos */}
        <Section title="Capítulos" emoji="📖">
          {doc.chapters.length === 0 ? (
            <Empty text="Nenhum capítulo escrito ainda." />
          ) : (
            <div className="space-y-8">
              {doc.chapters.map((c) => (
                <div key={c.id}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#FADADD] text-[#B24C63] font-medium">
                      Cap. {c.number}
                    </span>
                    <h3 className="font-bold flora-text-primary text-xl">
                      {c.title || `Capítulo ${c.number}`}
                    </h3>
                    <span className="text-xs flora-text-secondary">
                      [{CHAPTER_STATUS[c.status] || c.status}]
                    </span>
                  </div>
                  {c.summary && (
                    <p className="text-sm flora-text-secondary italic mb-3 pl-3 border-l-2 border-[#E6C2C7]">
                      {c.summary}
                    </p>
                  )}
                  {c.content && (
                    <div className="text-sm flora-text-primary leading-relaxed whitespace-pre-wrap">
                      {c.content}
                    </div>
                  )}
                  {!c.content && !c.summary && (
                    <p className="text-xs flora-text-secondary italic">Sem conteúdo ainda.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Acontecimentos Importantes */}
        <Section title="Acontecimentos Importantes" emoji="✨">
          {doc.events.length === 0 ? (
            <Empty text="Nenhum acontecimento importante aprovado." />
          ) : (
            <div className="space-y-4">
              {doc.events.map((e, i) => (
                <div key={e.id} className="pl-4 border-l-2 border-[#7EB8A2]">
                  <h3 className="font-bold flora-text-primary">
                    {i + 1}. {e.title}
                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full font-medium ${
                      e.suggestedBy === "COAUTHOR"
                        ? "bg-[#FADADD] text-[#B24C63]"
                        : "bg-[#D4E8DC] text-[#5A8870]"
                    }`}>
                      {e.suggestedBy === "COAUTHOR" ? "🌸 Flora" : "✍️ Autor"}
                    </span>
                  </h3>
                  <p className="text-sm flora-text-primary mt-1 leading-relaxed">{e.description}</p>
                  {e.impact && (
                    <p className="text-xs flora-text-secondary mt-1 italic">
                      Impacto: {e.impact}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Anotações */}
        <Section title="Anotações" emoji="📝" last>
          {doc.annotations.length === 0 ? (
            <Empty text="Sem anotações." />
          ) : (
            <div className="space-y-4">
              {Object.entries(
                doc.annotations.reduce<Record<string, typeof doc.annotations>>((acc, a) => {
                  if (!acc[a.category]) acc[a.category] = [];
                  acc[a.category].push(a);
                  return acc;
                }, {})
              ).map(([cat, items]) => (
                <div key={cat}>
                  <h4 className="font-bold flora-text-secondary text-sm uppercase tracking-wider mb-2">
                    {CATEGORY_LABELS[cat] || cat}
                  </h4>
                  <ul className="space-y-1 pl-4">
                    {items.map((a) => (
                      <li key={a.id} className="text-sm flora-text-primary flex gap-2">
                        <span className="text-[#D4818B]">•</span>
                        <span>{a.content}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Footer */}
        <footer className="text-center mt-10 pt-6 border-t border-[#E6C2C7]">
          <p className="text-xs flora-text-secondary italic">
            🌸 Documento gerado pelo Bloom Studio · {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </footer>
      </article>

      {/* Quick navigation */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => setSection("characters")} className="border-[#C48D9E] text-[#B24C63]">
          Editar personagens
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSection("chapters")} className="border-[#C48D9E] text-[#B24C63]">
          Editar capítulos
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSection("timeline")} className="border-[#C48D9E] text-[#B24C63]">
          Editar cronologia
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSection("events")} className="border-[#C48D9E] text-[#B24C63]">
          Editar acontecimentos
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSection("annotations")} className="border-[#C48D9E] text-[#B24C63]">
          Editar anotações
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  emoji,
  children,
  last,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "" : "mb-8"}>
      <h2 className="text-xl font-bold flora-text-primary mb-4 flex items-center gap-2 pb-2 border-b border-[#E6C2C7]">
        <span>{emoji}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm flora-text-secondary italic">{text}</p>;
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "rose" | "sage" | "gold";
}) {
  const colors = {
    rose: { bg: "bg-[#FADADD]", text: "text-[#B24C63]", accent: "text-[#8B6B7A]" },
    sage: { bg: "bg-[#D4E8DC]", text: "text-[#5A8870]", accent: "text-[#6B8A7A]" },
    gold: { bg: "bg-[#F4E4BC]", text: "text-[#8B6B3A]", accent: "text-[#8B7A4A]" },
  };
  const c = colors[color];
  return (
    <div className={`${c.bg} rounded-2xl p-4 flora-border border`}>
      <p className="text-xs uppercase tracking-wider font-medium text-[#8B6B7A] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      <p className={`text-xs ${c.accent} mt-0.5`}>{sub}</p>
    </div>
  );
}

/**
 * Gera HTML para a janela de impressão — estilo manuscrito limpo.
 */
function generatePrintHTML(doc: {
  title: string;
  description: string | null;
  status: string;
  genre: string | null;
  tone: string | null;
  characters: Array<{ name: string; description: string | null; role: string | null; traits: string | null }>;
  chapters: Array<{ number: number; title: string | null; summary: string | null; content: string | null; status: string }>;
  timeline: Array<{ title: string; description: string | null; date: string | null }>;
  events: Array<{ title: string; description: string; impact: string | null; suggestedBy: string }>;
  annotations: Array<{ content: string; category: string }>;
}): string {
  const esc = (s: string | null) => (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(doc.title)}</title>
<style>
  @page { margin: 2.5cm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2a1a22; line-height: 1.7; max-width: 700px; margin: 0 auto; padding: 2rem; }
  h1 { text-align: center; font-size: 2rem; margin-bottom: 0.5rem; color: #4A2C3A; }
  .desc { text-align: center; font-style: italic; color: #6b4a58; margin-bottom: 1rem; }
  .meta { text-align: center; font-size: 0.85rem; color: #8B6B7A; margin-bottom: 2rem; }
  h2 { font-size: 1.4rem; color: #4A2C3A; border-bottom: 1px solid #E6C2C7; padding-bottom: 0.3rem; margin-top: 2rem; }
  h3 { font-size: 1.1rem; color: #4A2C3A; }
  .char { border-left: 3px solid #D4818B; padding-left: 1rem; margin-bottom: 1rem; }
  .role { font-style: italic; color: #8B6B7A; font-size: 0.9rem; }
  .traits { font-size: 0.85rem; color: #8B6B7A; }
  .summary { font-style: italic; color: #6b4a58; border-left: 3px solid #E6C2C7; padding-left: 1rem; margin: 0.5rem 0 1rem; }
  .content { white-space: pre-wrap; margin-top: 0.5rem; }
  .badge { display: inline-block; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 9999px; background: #FADADD; color: #B24C63; margin-left: 0.3rem; }
  ol { padding-left: 1.5rem; }
  li { margin-bottom: 0.3rem; }
  .event { border-left: 3px solid #7EB8A2; padding-left: 1rem; margin-bottom: 1rem; }
  .impact { font-size: 0.85rem; color: #8B6B7A; font-style: italic; }
  .annotations h4 { font-size: 0.95rem; color: #8B6B7A; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1rem; }
  .annotations ul { list-style: none; padding-left: 1rem; }
  .annotations li { color: #4A2C3A; }
  .annotations li::before { content: "• "; color: #D4818B; }
  .footer { text-align: center; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #E6C2C7; font-size: 0.8rem; color: #8B6B7A; font-style: italic; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>🌸 ${esc(doc.title)}</h1>
  ${doc.description ? `<p class="desc">${esc(doc.description)}</p>` : ""}
  <p class="meta">
    ${STATUS_LABELS_PRINT[doc.status] || doc.status}
    ${doc.genre ? ` · ${esc(doc.genre)}` : ""}
    ${doc.tone ? ` · Tom: ${esc(doc.tone)}` : ""}
  </p>

  <h2>🎭 Personagens</h2>
  ${doc.characters.length === 0
    ? "<p><em>Nenhum personagem cadastrado.</em></p>"
    : doc.characters.map((c, i) => `
      <div class="char">
        <h3>${i + 1}. ${esc(c.name)}${c.role ? ` <span class="role">— ${esc(c.role)}</span>` : ""}</h3>
        ${c.description ? `<p>${esc(c.description)}</p>` : ""}
        ${c.traits ? `<p class="traits">Traços: ${esc(c.traits)}</p>` : ""}
      </div>
    `).join("")
  }

  <h2>📅 Cronologia</h2>
  ${doc.timeline.length === 0
    ? "<p><em>Sem eventos cronológicos.</em></p>"
    : `<ol>${doc.timeline.map((t) => `
      <li><strong>${esc(t.title)}</strong>${t.date ? ` <em>(${esc(t.date)})</em>` : ""}${t.description ? `<br><span style="font-size:0.9rem;color:#6b4a58">${esc(t.description)}</span>` : ""}</li>
    `).join("")}</ol>`
  }

  <h2>📖 Capítulos</h2>
  ${doc.chapters.length === 0
    ? "<p><em>Nenhum capítulo escrito ainda.</em></p>"
    : doc.chapters.map((c) => `
      <div style="margin-bottom: 2rem;">
        <h3>Capítulo ${c.number}${c.title ? ` — ${esc(c.title)}` : ""} <span class="badge">${CHAPTER_STATUS_PRINT[c.status] || c.status}</span></h3>
        ${c.summary ? `<p class="summary">${esc(c.summary)}</p>` : ""}
        ${c.content ? `<div class="content">${esc(c.content)}</div>` : ""}
      </div>
    `).join("")
  }

  <h2>✨ Acontecimentos Importantes</h2>
  ${doc.events.length === 0
    ? "<p><em>Nenhum acontecimento importante aprovado.</em></p>"
    : doc.events.map((e, i) => `
      <div class="event">
        <h3>${i + 1}. ${esc(e.title)} <span class="badge">${e.suggestedBy === "COAUTHOR" ? "🌸 Flora" : "✍️ Autor"}</span></h3>
        <p>${esc(e.description)}</p>
        ${e.impact ? `<p class="impact">Impacto: ${esc(e.impact)}</p>` : ""}
      </div>
    `).join("")
  }

  <h2>📝 Anotações</h2>
  ${doc.annotations.length === 0
    ? "<p><em>Sem anotações.</em></p>"
    : `<div class="annotations">${Object.entries(
        doc.annotations.reduce<Record<string, typeof doc.annotations>>((acc, a) => {
          if (!acc[a.category]) acc[a.category] = [];
          acc[a.category].push(a);
          return acc;
        }, {})
      ).map(([cat, items]) => `
        <h4>${CATEGORY_LABELS_PRINT[cat] || cat}</h4>
        <ul>${items.map((a) => `<li>${esc(a.content)}</li>`).join("")}</ul>
      `).join("")}</div>`
  }

  <p class="footer">🌸 Documento gerado pelo Bloom Studio · ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
</body>
</html>`;
}

const STATUS_LABELS_PRINT: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em progresso",
  COMPLETED: "Concluída",
  ON_HOLD: "Pausada",
};

const CHAPTER_STATUS_PRINT: Record<string, string> = {
  DRAFT: "Rascunho",
  WRITING: "Escrevendo",
  REVISION: "Revisão",
  COMPLETED: "Concluído",
};

const CATEGORY_LABELS_PRINT: Record<string, string> = {
  IDEA: "💡 Ideias",
  QUESTION: "❓ Perguntas",
  DECISION: "🚩 Decisões",
  OBSERVATION: "👁️ Observações",
};
