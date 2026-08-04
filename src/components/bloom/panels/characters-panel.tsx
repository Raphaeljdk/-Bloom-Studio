"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, User, X, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useStoryStore, type Character } from "@/stores/story-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props { storyId: string }

export function CharactersPanel({ storyId }: Props) {
  const characters = useStoryStore((s) => s.currentStory?.characters || []);
  const addCharacter = useStoryStore((s) => s.addCharacter);
  const updateCharacter = useStoryStore((s) => s.updateCharacter);
  const removeCharacter = useStoryStore((s) => s.removeCharacter);
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTraits, setNewTraits] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; role?: string; traits?: string }) =>
      api.createCharacter(storyId, data) as Promise<Character>,
    onSuccess: (c) => {
      addCharacter(c);
      setCreating(false);
      setNewName(""); setNewRole(""); setNewDesc(""); setNewTraits("");
      toast.success(`Personagem "${c.name}" criado 🌸`);
      qc.invalidateQueries({ queryKey: ["story", storyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Character> }) =>
      api.updateCharacter(storyId, id, patch),
    onSuccess: (_d, { id, patch }) => {
      updateCharacter(id, patch);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCharacter(storyId, id),
    onSuccess: (_d, id) => {
      removeCharacter(id);
      toast.info("Personagem removido");
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName,
      role: newRole || undefined,
      description: newDesc || undefined,
      traits: newTraits || undefined,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm flora-text-secondary">
          {characters.length} {characters.length === 1 ? "personagem" : "personagens"} na história
        </p>
        <Button
          onClick={() => setCreating(true)}
          className="flora-gradient-accent text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo personagem
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flora-text-primary">Novo personagem</h3>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flora-text-secondary">Nome *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Helena Vidal"
                  className="bg-white border-[#E6C2C7]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flora-text-secondary">Função</Label>
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Protagonista"
                  className="bg-white border-[#E6C2C7]"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs flora-text-secondary">Descrição</Label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Botânica de 34 anos, recém-saída de um luto longo..."
                  rows={3}
                  className="bg-white border-[#E6C2C7] resize-none"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs flora-text-secondary">Traços</Label>
                <Input
                  value={newTraits}
                  onChange={(e) => setNewTraits(e.target.value)}
                  placeholder="Observadora, reservada, sente-se culpada"
                  className="bg-white border-[#E6C2C7]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
                className="flora-gradient-accent text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                {createMutation.isPending ? "Salvando..." : "Criar"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {characters.length === 0 && !creating ? (
        <EmptyState onAdd={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((c) => (
            <CharacterCard
              key={c.id}
              character={c}
              onUpdate={(patch) => updateMutation.mutate({ id: c.id, patch })}
              onDelete={() => deleteMutation.mutate(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterCard({
  character,
  onUpdate,
  onDelete,
}: {
  character: Character;
  onUpdate: (patch: Partial<Character>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(character);

  const save = () => {
    onUpdate({
      name: draft.name,
      description: draft.description,
      role: draft.role,
      traits: draft.traits,
    });
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl flora-border border p-5 flora-shadow-soft">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-full flora-gradient-romantic flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="font-semibold text-base border-[#E6C2C7]"
            />
          ) : (
            <h3 className="font-bold flora-text-primary truncate">{character.name}</h3>
          )}
          {editing ? (
            <Input
              value={draft.role || ""}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              placeholder="Função na história"
              className="mt-1 text-xs border-[#E6C2C7]"
            />
          ) : (
            character.role && (
              <span className="text-xs text-[#B24C63] font-medium">{character.role}</span>
            )
          )}
        </div>
        <div className="flex gap-1">
          {editing ? (
            <Button size="sm" onClick={save} className="bg-[#7EB8A2] text-white hover:bg-[#6BA890]">
              <Save className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setDraft(character); setEditing(true); }}
              className="text-[#8B6B7A] hover:bg-[#FADADD]"
            >
              Editar
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-[#8B6B7A] hover:text-[#D4818B] hover:bg-[#FADADD]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {editing ? (
          <>
            <Textarea
              value={draft.description || ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Descrição do personagem"
              rows={3}
              className="border-[#E6C2C7] resize-none"
            />
            <Input
              value={draft.traits || ""}
              onChange={(e) => setDraft({ ...draft, traits: e.target.value })}
              placeholder="Traços de personalidade"
              className="border-[#E6C2C7]"
            />
          </>
        ) : (
          <>
            {character.description && (
              <p className="flora-text-primary leading-relaxed">{character.description}</p>
            )}
            {character.traits && (
              <p className="text-xs flora-text-secondary italic">
                <span className="font-medium not-italic">Traços:</span> {character.traits}
              </p>
            )}
            {!character.description && !character.traits && (
              <p className="text-xs flora-text-secondary italic">Sem detalhes ainda.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full flora-gradient-soft mb-4">
        <User className="w-7 h-7 text-[#C48D9E]" />
      </div>
      <h3 className="font-bold flora-text-primary mb-1">Sem personagens ainda</h3>
      <p className="text-sm flora-text-secondary mb-4">
        Adicione quem habita sua história.
      </p>
      <Button onClick={onAdd} className="flora-gradient-accent text-white">
        <Plus className="w-4 h-4 mr-1" />
        Adicionar personagem
      </Button>
    </div>
  );
}
