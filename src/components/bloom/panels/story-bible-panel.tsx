"use client";

import { BookMarked, BookOpen, CalendarDays, ChevronRight, Lightbulb, ScrollText, Users } from "lucide-react";
import { useStoryStore } from "@/stores/story-store";
import { useUIStore, type StorySection } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

interface Props { storyId: string }

export function StoryBiblePanel({ storyId }: Props) {
  const story = useStoryStore(s => s.currentStory);
  const go = useUIStore(s => s.setSection);
  const openChapter = useUIStore(s => s.setCurrentChapter);

  if (!story) return <div className="p-8 text-sm flora-text-secondary">Carregando a Bíblia da História...</div>;

  const chapters = [...story.chapters].sort((a, b) => a.number - b.number);
  const timeline = [...story.timeline].sort((a, b) => a.order - b.order);
  const approvedEvents = story.events.filter(e => e.isApproved);
  const words = chapters.reduce((sum, ch) => sum + (ch.content?.trim().split(/\s+/).filter(Boolean).length || 0), 0);
  const duplicateNames = story.characters
    .filter((char, i, chars) => chars.findIndex(other => other.name.trim().toLocaleLowerCase("pt-BR") === char.name.trim().toLocaleLowerCase("pt-BR")) !== i)
    .map(c => c.name);
  const missingContent = chapters.filter(c => !c.content?.trim()).length;

  const navigate = (section: StorySection, chapterId?: string) => {
    go(section);
    if (chapterId) openChapter(chapterId);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-14 sm:p-6">
      <div className="overflow-hidden rounded-2xl border border-[#E6C2C7] bg-gradient-to-br from-[#FFF5F2] to-[#FADADD] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#B24C63]">
              <BookMarked className="h-4 w-4" /> Bíblia da História
            </div>
            <h2 className="text-2xl font-bold flora-text-primary">Seu universo literário em um só lugar</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed flora-text-secondary">
              Esta central reúne informações dos personagens, capítulos, acontecimentos e cronologia.
              A Flora usa esse contexto para ajudar você a manter a coerência narrativa.
            </p>
          </div>
          <Button variant="outline" className="border-[#C48D9E] bg-white/70 text-[#B24C63]"
            onClick={() => navigate("characters")}>Atualizar personagens <ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Personagens", value: story.characters.length },
            { label: "Capítulos", value: chapters.length },
            { label: "Eventos definidos", value: approvedEvents.length },
            { label: "Palavras", value: words.toLocaleString("pt-BR") },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-white/80 p-3">
              <p className="text-xs flora-text-secondary">{item.label}</p>
              <p className="mt-1 text-xl font-bold flora-text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {(duplicateNames.length > 0 || missingContent > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Lightbulb className="h-4 w-4" /> Pontos para revisar
          </div>
          {duplicateNames.length > 0 && <p className="text-xs text-amber-900">Nomes de personagens repetidos: {duplicateNames.join(", ")}</p>}
          {missingContent > 0 && <p className="text-xs text-amber-900">{missingContent} {missingContent === 1 ? "capítulo ainda não tem" : "capítulos ainda não têm"} conteúdo escrito.</p>}
          <p className="mt-2 text-xs text-amber-800">São alertas estruturais, não necessariamente erros da sua história.</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E6C2C7] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold flora-text-primary"><Users className="h-4 w-4 text-[#B24C63]" /> Elenco</h3>
            <button className="text-xs font-medium text-[#B24C63] hover:underline" onClick={() => navigate("characters")}>Gerenciar</button>
          </div>
          {story.characters.length ? <div className="space-y-2">
            {story.characters.map(char => (
              <div key={char.id} className="rounded-xl border border-[#F3E1E3] bg-[#FFF9F8] p-3">
                <p className="text-sm font-semibold flora-text-primary">{char.name} {char.role && <span className="font-normal text-[#B24C63]">· {char.role}</span>}</p>
                {char.description && <p className="mt-1 line-clamp-3 text-xs flora-text-secondary">{char.description}</p>}
                {char.traits && <p className="mt-1 text-xs italic flora-text-secondary">Traços: {char.traits}</p>}
              </div>
            ))}
          </div> : <p className="text-sm flora-text-secondary">Adicione personagens para construir o elenco da história.</p>}
        </section>

        <section className="rounded-2xl border border-[#E6C2C7] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold flora-text-primary"><CalendarDays className="h-4 w-4 text-[#B24C63]" /> Linha do tempo</h3>
            <button className="text-xs font-medium text-[#B24C63] hover:underline" onClick={() => navigate("timeline")}>Gerenciar</button>
          </div>
          {timeline.length ? <ol className="space-y-3 border-l-2 border-[#E6C2C7] pl-4">
            {timeline.map((event, i) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#C48D9E]" />
                <p className="text-sm font-semibold flora-text-primary">{i+1}. {event.title} {event.date && <span className="font-normal text-[#B24C63]">· {event.date}</span>}</p>
                {event.description && <p className="mt-1 text-xs flora-text-secondary">{event.description}</p>}
              </li>
            ))}
          </ol> : <p className="text-sm flora-text-secondary">Organize os acontecimentos em sequência cronológica.</p>}
        </section>

        <section className="rounded-2xl border border-[#E6C2C7] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold flora-text-primary"><BookOpen className="h-4 w-4 text-[#B24C63]" /> Estrutura dos capítulos</h3>
            <button className="text-xs font-medium text-[#B24C63] hover:underline" onClick={() => navigate("chapters")}>Gerenciar</button>
          </div>
          {chapters.length ? <div className="space-y-2">
            {chapters.map(chapter => (
              <button key={chapter.id} onClick={() => navigate("chapters", chapter.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#F3E1E3] p-3 text-left transition hover:bg-[#FFF5F2]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FADADD] text-sm font-bold text-[#B24C63]">{chapter.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold flora-text-primary">{chapter.title || `Capítulo ${chapter.number}`}</span>
                  <span className="block truncate text-xs flora-text-secondary">{chapter.summary || "Sem resumo cadastrado"}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#C48D9E]" />
              </button>
            ))}
          </div> : <p className="text-sm flora-text-secondary">Seu livro ainda não tem capítulos.</p>}
        </section>

        <section className="rounded-2xl border border-[#E6C2C7] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold flora-text-primary"><ScrollText className="h-4 w-4 text-[#B24C63]" /> Fatos confirmados</h3>
            <button className="text-xs font-medium text-[#B24C63] hover:underline" onClick={() => navigate("events")}>Gerenciar</button>
          </div>
          {approvedEvents.length ? <div className="space-y-2">
            {approvedEvents.map(event => (
              <div key={event.id} className="rounded-xl border border-[#F3E1E3] p-3">
                <p className="text-sm font-semibold flora-text-primary">{event.title}</p>
                <p className="mt-1 text-xs flora-text-secondary">{event.description}</p>
                {event.impact && <p className="mt-1 text-xs italic text-[#B24C63]">Impacto: {event.impact}</p>}
              </div>
            ))}
          </div> : <p className="text-sm flora-text-secondary">Aprove acontecimentos no painel para registrá-los como fatos da história.</p>}
        </section>
      </div>

      <p className="text-center text-xs flora-text-secondary">Esta central é construída a partir dos dados da sua história. Não cria fatos automaticamente.</p>
    </div>
  );
}
