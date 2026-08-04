"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, StickyNote, Lightbulb, HelpCircle, Flag, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useStoryStore, type Annotation } from "@/stores/story-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

interface Props { storyId: string }

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Lightbulb; color: string; bg: string }> = {
  IDEA: { label: "Ideia", icon: Lightbulb, color: "text-[#B24C63]", bg: "bg-[#FADADD]" },
  QUESTION: { label: "Pergunta", icon: HelpCircle, color: "text-[#C48D9E]", bg: "bg-[#E6C2C7]" },
  DECISION: { label: "Decisão", icon: Flag, color: "text-[#7EB8A2]", bg: "bg-[#D4E8DC]" },
  OBSERVATION: { label: "Observação", icon: Eye, color: "text-[#E8B84B]", bg: "bg-[#F4E4BC]" },
};

export function AnnotationsPanel({ storyId }: Props) {
  const annotations = useStoryStore((s) => s.currentStory?.annotations || []);
  const addAnnotation = useStoryStore((s) => s.addAnnotation);
  const removeAnnotation = useStoryStore((s) => s.removeAnnotation);
  const qc = useQueryClient();

  const [content, setContent] = useState("");
  const [category, setCategory] = useState("IDEA");

  const createMutation = useMutation({
    mutationFn: (data: { content: string; category: string }) =>
      api.createAnnotation(storyId, data) as Promise<Annotation>,
    onSuccess: (a) => {
      addAnnotation(a);
      setContent("");
      toast.success("Anotação criada 🌸");
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAnnotation(storyId, id),
    onSuccess: (_d, id) => {
      removeAnnotation(id);
      toast.info("Anotação removida");
    },
  });

  // Agrupa por categoria
  const grouped: Record<string, Annotation[]> = {};
  annotations.forEach((a) => {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <p className="text-sm flora-text-secondary mb-4">
        {annotations.length} anotaç{annotations.length === 1 ? "ão" : "ões"}
      </p>

      {/* Composer */}
      <div className="bg-white rounded-2xl flora-border border p-4 mb-6 flora-shadow-soft">
        <div className="flex gap-2 mb-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36 bg-[#FDF2F0] border-[#E6C2C7]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDEA">💡 Ideia</SelectItem>
              <SelectItem value="QUESTION">❓ Pergunta</SelectItem>
              <SelectItem value="DECISION">🚩 Decisão</SelectItem>
              <SelectItem value="OBSERVATION">👁️ Observação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Anote uma ideia, dúvida, decisão ou observação sobre a história..."
          rows={3}
          className="bg-[#FDF2F0] border-[#E6C2C7] resize-none mb-2"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => createMutation.mutate({ content, category })}
            disabled={!content.trim() || createMutation.isPending}
            className="flora-gradient-accent text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            {createMutation.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
      </div>

      {annotations.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full flora-gradient-soft mb-4">
            <StickyNote className="w-7 h-7 text-[#C48D9E]" />
          </div>
          <h3 className="font-bold flora-text-primary mb-1">Sem anotações ainda</h3>
          <p className="text-sm flora-text-secondary">
            Capture ideias, perguntas, decisões e observações sobre sua história.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => {
            const conf = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.IDEA;
            const Icon = conf.icon;
            return (
              <div key={cat}>
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${conf.color}`}>
                  <Icon className="w-4 h-4" />
                  {conf.label} ({items.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((a) => (
                    <motion.div
                      key={a.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`group ${conf.bg} rounded-xl p-4 flora-border border`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${conf.color}`} />
                        <p className="text-sm flora-text-primary flex-1 whitespace-pre-wrap">{a.content}</p>
                        <button
                          onClick={() => deleteMutation.mutate(a.id)}
                          className="opacity-0 group-hover:opacity-100 transition text-[#8B6B7A] hover:text-[#D4818B] p-1 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs flora-text-secondary mt-2 text-right">
                        {new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
