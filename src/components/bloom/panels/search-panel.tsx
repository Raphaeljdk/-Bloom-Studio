"use client";

import { useMemo, useState } from "react";
import { Search, FileText, Users, Clock, Sparkles, X } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { useStoryDetail } from "@/hooks/use-stories";
import { useUIStore } from "@/stores/ui-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

interface Props { storyId: string }

type FilterType = "all" | "chapters" | "characters" | "timeline" | "events" | "annotations";

interface SearchResult {
  type: "chapter" | "character" | "timeline" | "event" | "annotation";
  id: string;
  title: string;
  excerpt: string;
  chapterNumber?: number;
}

export function SearchPanel({ storyId }: Props) {
  const { data: story } = useStoryDetail(storyId);
  const data = useStoryStore((s) => s.currentStory);
  const setSection = useUIStore((s) => s.setSection);
  const setCurrentChapter = useUIStore((s) => s.setCurrentChapter);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const results = useMemo<SearchResult[]>(() => {
    if (!data || !query.trim()) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    if (filter === "all" || filter === "chapters") {
      data.chapters.forEach((c) => {
        const haystack = `${c.title || ""} ${c.summary || ""} ${c.content || ""}`.toLowerCase();
        if (haystack.includes(q)) {
          // Encontra o trecho que contém a query
          const content = c.content || c.summary || c.title || "";
          const idx = content.toLowerCase().indexOf(q);
          const start = Math.max(0, idx - 40);
          const end = Math.min(content.length, idx + q.length + 80);
          const excerpt = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
          out.push({
            type: "chapter",
            id: c.id,
            title: `Cap. ${c.number}${c.title ? ` — ${c.title}` : ""}`,
            excerpt,
            chapterNumber: c.number,
          });
        }
      });
    }

    if (filter === "all" || filter === "characters") {
      data.characters.forEach((c) => {
        const haystack = `${c.name} ${c.description || ""} ${c.role || ""} ${c.traits || ""}`.toLowerCase();
        if (haystack.includes(q)) {
          out.push({
            type: "character",
            id: c.id,
            title: c.name,
            excerpt: `${c.role ? c.role + " · " : ""}${c.description || c.traits || ""}`,
          });
        }
      });
    }

    if (filter === "all" || filter === "timeline") {
      data.timeline.forEach((t) => {
        const haystack = `${t.title} ${t.description || ""} ${t.date || ""}`.toLowerCase();
        if (haystack.includes(q)) {
          out.push({
            type: "timeline",
            id: t.id,
            title: t.title,
            excerpt: `${t.date ? t.date + " · " : ""}${t.description || ""}`,
          });
        }
      });
    }

    if (filter === "all" || filter === "events") {
      data.events.forEach((e) => {
        const haystack = `${e.title} ${e.description} ${e.impact || ""}`.toLowerCase();
        if (haystack.includes(q)) {
          out.push({
            type: "event",
            id: e.id,
            title: e.title,
            excerpt: e.description + (e.impact ? ` · Impacto: ${e.impact}` : ""),
          });
        }
      });
    }

    if (filter === "all" || filter === "annotations") {
      data.annotations.forEach((a) => {
        if (a.content.toLowerCase().includes(q)) {
          out.push({
            type: "annotation",
            id: a.id,
            title: a.category,
            excerpt: a.content,
          });
        }
      });
    }

    return out.slice(0, 50); // limite de 50 resultados
  }, [data, query, filter]);

  const typeIcon = {
    chapter: FileText,
    character: Users,
    timeline: Clock,
    event: Sparkles,
    annotation: FileText,
  };

  const typeColor = {
    chapter: "bg-[#FADADD] text-[#B24C63]",
    character: "bg-[#D4E8DC] text-[#5A8870]",
    timeline: "bg-[#E6C2C7] text-[#4A2C3A]",
    event: "bg-[#F4E4BC] text-[#8B6B3A]",
    annotation: "bg-[#FADADD] text-[#D4818B]",
  };

  const typeLabel = {
    chapter: "Capítulo",
    character: "Personagem",
    timeline: "Cronologia",
    event: "Acontecimento",
    annotation: "Anotação",
  };

  const handleResultClick = (r: SearchResult) => {
    if (r.type === "chapter") {
      setSection("chapters");
      // precisa achar o chapter id pelo número
      const ch = data?.chapters.find((c) => c.number === r.chapterNumber);
      if (ch) setCurrentChapter(ch.id);
    } else if (r.type === "character") setSection("characters");
    else if (r.type === "timeline") setSection("timeline");
    else if (r.type === "event") setSection("events");
    else if (r.type === "annotation") setSection("annotations");
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold flora-text-primary flex items-center gap-2 mb-1">
          <Search className="w-5 h-5" />
          Busca na história
        </h2>
        <p className="text-sm flora-text-secondary">
          Encontre qualquer trecho em personagens, capítulos, cronologia, eventos e anotações
        </p>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flora-text-secondary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque por palavra, frase, personagem..."
            className="pl-10 pr-10 bg-white border-[#E6C2C7] focus:border-[#C48D9E]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B6B7A] hover:text-[#B24C63]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-full sm:w-44 bg-white border-[#E6C2C7]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tudo</SelectItem>
            <SelectItem value="chapters">Capítulos</SelectItem>
            <SelectItem value="characters">Personagens</SelectItem>
            <SelectItem value="timeline">Cronologia</SelectItem>
            <SelectItem value="events">Acontecimentos</SelectItem>
            <SelectItem value="annotations">Anotações</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resultados */}
      {!query.trim() ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full flora-gradient-soft mb-4">
            <Search className="w-7 h-7 text-[#C48D9E]" />
          </div>
          <h3 className="font-bold flora-text-primary mb-1">Busque na sua história</h3>
          <p className="text-sm flora-text-secondary max-w-md mx-auto">
            Digite acima para encontrar trechos em qualquer parte da história.
            Ex: "medalhão", "Helena", "jardim", "carta"...
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="font-bold flora-text-primary mb-1">Nenhum resultado</h3>
          <p className="text-sm flora-text-secondary">
            Nada encontrado para &ldquo;{query}&rdquo; {filter !== "all" && `em ${filter}`}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm flora-text-secondary mb-2">
            {results.length} resultado{results.length === 1 ? "" : "s"} para &ldquo;{query}&rdquo;
          </p>
          {results.map((r) => {
            const Icon = typeIcon[r.type];
            const color = typeColor[r.type];
            const label = typeLabel[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleResultClick(r)}
                className="w-full text-left bg-white rounded-xl flora-border border p-3 sm:p-4 hover:flora-shadow-soft transition group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#FDF2F0] text-[#8B6B7A] font-medium">
                        {label}
                      </span>
                      <h4 className="font-semibold flora-text-primary text-sm truncate">{r.title}</h4>
                    </div>
                    <p className="text-xs sm:text-sm flora-text-secondary line-clamp-2">
                      {r.excerpt}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
