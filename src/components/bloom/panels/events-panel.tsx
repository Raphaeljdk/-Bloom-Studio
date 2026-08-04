"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Sparkles, X, Save, Check, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useStoryStore, type ImportantEvent } from "@/stores/story-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props { storyId: string }

export function ImportantEventsPanel({ storyId }: Props) {
  const events = useStoryStore((s) => s.currentStory?.events || []);
  const addEvent = useStoryStore((s) => s.addEvent);
  const updateEvent = useStoryStore((s) => s.updateEvent);
  const removeEvent = useStoryStore((s) => s.removeEvent);
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImpact, setNewImpact] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; impact?: string }) =>
      api.createEvent(storyId, data) as Promise<ImportantEvent>,
    onSuccess: (e) => {
      addEvent(e);
      setCreating(false);
      setNewTitle(""); setNewDesc(""); setNewImpact("");
      toast.success("Acontecimento importante adicionado 🌷");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveSuggestion(id),
    onSuccess: (_d, id) => {
      updateEvent(id, { isApproved: true });
      toast.success("Evento aprovado ✨");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEvent(storyId, id),
    onSuccess: (_d, id) => {
      removeEvent(id);
      toast.info("Evento removido");
    },
  });

  const approved = events.filter((e) => e.isApproved);
  const pending = events.filter((e) => !e.isApproved);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm flora-text-secondary">
          {approved.length} aprovado{approved.length === 1 ? "" : "s"} · {pending.length} pendente{pending.length === 1 ? "" : "s"}
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
              <h3 className="font-semibold flora-text-primary">Novo acontecimento importante</h3>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs flora-text-secondary">Título *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Descoberta do jardim"
                  className="bg-white border-[#E6C2C7]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flora-text-secondary">Descrição *</Label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Helena percebe que o jardim não é um jardim comum — ele responde a toques com memórias."
                  rows={3}
                  className="bg-white border-[#E6C2C7] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flora-text-secondary">Impacto narrativo</Label>
                <Input
                  value={newImpact}
                  onChange={(e) => setNewImpact(e.target.value)}
                  placeholder="Estabelece a regra mágica central da narrativa"
                  className="bg-white border-[#E6C2C7]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate({
                  title: newTitle,
                  description: newDesc,
                  impact: newImpact || undefined,
                })}
                disabled={!newTitle.trim() || !newDesc.trim() || createMutation.isPending}
                className="flora-gradient-accent text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pendentes */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold flora-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Sugestões pendentes da Flora
          </h3>
          <div className="space-y-3">
            {pending.map((e) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#FADADD] to-[#E6C2C7] rounded-2xl p-4 flora-border border"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#B24C63]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold flora-text-primary">{e.title}</h4>
                    <p className="text-sm flora-text-primary mt-1">{e.description}</p>
                    {e.impact && (
                      <p className="text-xs flora-text-secondary mt-1 italic">
                        <span className="font-medium not-italic">Impacto:</span> {e.impact}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(e.id)}
                        disabled={approveMutation.isPending}
                        className="bg-[#7EB8A2] text-white hover:bg-[#6BA890]"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(e.id)}
                        className="text-[#8B6B7A] hover:text-[#D4818B] hover:bg-white/40"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Recusar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Aprovados */}
      {approved.length === 0 && pending.length === 0 && !creating ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full flora-gradient-soft mb-4">
            <Sparkles className="w-7 h-7 text-[#C48D9E]" />
          </div>
          <h3 className="font-bold flora-text-primary mb-1">Sem acontecimentos importantes</h3>
          <p className="text-sm flora-text-secondary mb-4 max-w-md mx-auto">
            Estes são eventos centrais da trama. Você pode criá-los manualmente ou
            esperar a Flora sugerir algum via chat.
          </p>
          <Button onClick={() => setCreating(true)} className="flora-gradient-accent text-white">
            <Plus className="w-4 h-4 mr-1" />
            Adicionar acontecimento
          </Button>
        </div>
      ) : approved.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold flora-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Acontecimentos aprovados
          </h3>
          <div className="space-y-3">
            {approved.map((e, idx) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-white rounded-2xl flora-border border p-4 flora-shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7EB8A2] flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold flora-text-primary">{e.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.suggestedBy === "COAUTHOR"
                          ? "bg-[#FADADD] text-[#B24C63]"
                          : "bg-[#E6C2C7] text-[#4A2C3A]"
                      }`}>
                        {e.suggestedBy === "COAUTHOR" ? "🌸 Flora" : "✍️ Você"}
                      </span>
                    </div>
                    <p className="text-sm flora-text-primary">{e.description}</p>
                    {e.impact && (
                      <p className="text-xs flora-text-secondary mt-1 italic">
                        <span className="font-medium not-italic">Impacto:</span> {e.impact}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(e.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-[#8B6B7A] hover:text-[#D4818B] p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
