"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Clock, X, Save, Calendar } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useStoryStore, type TimelineEvent } from "@/stores/story-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props { storyId: string }

export function TimelinePanel({ storyId }: Props) {
  const timeline = useStoryStore((s) => s.currentStory?.timeline || []);
  const addTimelineEvent = useStoryStore((s) => s.addTimelineEvent);
  const updateTimelineEvent = useStoryStore((s) => s.updateTimelineEvent);
  const removeTimelineEvent = useStoryStore((s) => s.removeTimelineEvent);
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; date?: string }) =>
      api.createTimelineEvent(storyId, data) as Promise<TimelineEvent>,
    onSuccess: (t) => {
      addTimelineEvent(t);
      setCreating(false);
      setNewTitle(""); setNewDesc(""); setNewDate("");
      toast.success("Evento cronológico criado 🌸");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTimelineEvent(storyId, id),
    onSuccess: (_d, id) => {
      removeTimelineEvent(id);
      toast.info("Evento removido da cronologia");
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm flora-text-secondary">
          {timeline.length} {timeline.length === 1 ? "evento" : "eventos"} na cronologia
        </p>
        <Button
          onClick={() => setCreating(true)}
          className="flora-gradient-accent text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo evento
        </Button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-[#FADADD] rounded-2xl p-5 flora-border border overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flora-text-primary">Novo evento cronológico</h3>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs flora-text-secondary">Título *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Morte de Tia Rosa"
                  className="bg-white border-[#E6C2C7]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flora-text-secondary">Data / momento</Label>
                <Input
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder="Outono, semana 1"
                  className="bg-white border-[#E6C2C7]"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs flora-text-secondary">Descrição</Label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Helena recebe a notícia e decide voltar."
                  rows={2}
                  className="bg-white border-[#E6C2C7] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate({
                  title: newTitle,
                  description: newDesc || undefined,
                  date: newDate || undefined,
                })}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="flora-gradient-accent text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {timeline.length === 0 && !creating ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full flora-gradient-soft mb-4">
            <Clock className="w-7 h-7 text-[#C48D9E]" />
          </div>
          <h3 className="font-bold flora-text-primary mb-1">Cronologia vazia</h3>
          <p className="text-sm flora-text-secondary mb-4">
            Defina a ordem dos acontecimentos da sua história.
          </p>
          <Button onClick={() => setCreating(true)} className="flora-gradient-accent text-white">
            <Plus className="w-4 h-4 mr-1" />
            Adicionar primeiro evento
          </Button>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Linha vertical */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#C48D9E] via-[#D4818B] to-[#E6C2C7]" />

          <div className="space-y-4">
            {timeline.map((t, idx) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative"
              >
                {/* Marcador */}
                <div className="absolute -left-5 top-4 w-5 h-5 rounded-full bg-white border-2 border-[#B24C63] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#B24C63]" />
                </div>

                <div className="group bg-white rounded-xl flora-border border p-4 flora-shadow-soft">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-[#B24C63]">
                          #{idx + 1}
                        </span>
                        {t.date && (
                          <span className="text-xs flora-text-secondary flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t.date}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold flora-text-primary">{t.title}</h3>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition text-[#8B6B7A] hover:text-[#D4818B] p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {t.description && (
                    <p className="text-sm flora-text-secondary mt-1">{t.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
