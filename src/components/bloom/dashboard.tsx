"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, Flower2, BookOpen, Users, Clock,
  Sparkles, Trash2, Calendar, LogOut, Filter, Shield
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStories } from "@/hooks/use-stories";
import { useUIStore } from "@/stores/ui-store";
import { useStoryStore } from "@/stores/story-store";
import { ThemeSwitcher } from "./theme-switcher";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-[#E8C98B] text-[#4A2C3A]" },
  IN_PROGRESS: { label: "Em progresso", color: "bg-[#D4818B] text-white" },
  COMPLETED: { label: "Concluída", color: "bg-[#7EB8A2] text-white" },
  ON_HOLD: { label: "Pausada", color: "bg-[#C48D9E] text-white" },
};

export function Dashboard() {
  const { stories, isLoading, create, isCreating, remove } = useStories();
  const queryClient = useQueryClient();
  const openStory = useUIStore((s) => s.openStory);
  const setView = useUIStore((s) => s.setView);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const statusFilter = useUIStore((s) => s.statusFilter);
  const setStatusFilter = useUIStore((s) => s.setStatusFilter);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newGenre, setNewGenre] = useState("");
  const [newTone, setNewTone] = useState("");

  // Hook simples para ler o user (inclui role)
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  useEffect(() => {
    const check = () => {
      const auth = (window as unknown as { __bloomAuth?: { user?: { role?: string } } }).__bloomAuth;
      if (auth?.user) setUserRole(auth.user.role);
    };
    check();
    const i = setInterval(check, 500);
    return () => clearInterval(i);
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await create({
      title: newTitle,
      description: newDesc,
      genre: newGenre,
      tone: newTone,
    });
    setNewTitle(""); setNewDesc(""); setNewGenre(""); setNewTone("");
    setCreateOpen(false);
  };

  const handleDemo = async () => {
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) throw new Error("Falha no seed");
      const data = await res.json();
      toast.success(`História de exemplo criada: "${data.storyTitle}" 🌸`);
      // Invalida cache para recarregar sem reload completo
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar seed");
    }
  };

  const handleLogout = async () => {
    const auth = (window as unknown as { __bloomAuth?: { logout?: () => Promise<void> } }).__bloomAuth;
    await auth?.logout?.();
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Remover "${title}"? Esta ação não pode ser desfeita.`)) return;
    await remove(id);
  };

  return (
    <div className="min-h-screen flora-bg-primary flora-pattern">
      {/* Header */}
      <header className="border-b border-[#E6C2C7] bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flora-gradient-accent flex items-center justify-center flora-shadow-soft flex-shrink-0">
              <Flower2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold flora-text-primary truncate">Bloom Studio</h1>
              <p className="text-xs flora-text-secondary hidden sm:block">Estúdio de criação literária</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeSwitcher />
            {userRole === "ADMIN" && (
              <Button
                onClick={() => setView("admin")}
                variant="ghost"
                size="sm"
                className="text-[#8B6B7A] hover:text-[#B24C63] hover:bg-[#FADADD]"
                title="Painel administrativo"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Admin</span>
              </Button>
            )}
            <Button
              onClick={handleDemo}
              variant="ghost"
              size="sm"
              className="text-[#8B6B7A] hover:text-[#B24C63] hover:bg-[#FADADD]"
            >
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exemplo</span>
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-[#8B6B7A] hover:text-[#B24C63]"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C48D9E] to-transparent" />
            <span className="text-2xl">🌸</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C48D9E] to-transparent" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold flora-text-gradient mb-3 text-center">
            Suas histórias
          </h2>
          <p className="text-sm sm:text-base flora-text-secondary text-center max-w-2xl mx-auto">
            Cada jardim começa com uma semente. Escolha uma história para continuar ou plante uma nova.
          </p>
        </motion.div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flora-text-secondary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="pl-10 bg-white border-[#E6C2C7] focus:border-[#C48D9E] focus:ring-[#C48D9E]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-white border-[#E6C2C7]">
              <Filter className="w-4 h-4 mr-2 text-[#8B6B7A]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="IN_PROGRESS">Em progresso</SelectItem>
              <SelectItem value="COMPLETED">Concluída</SelectItem>
              <SelectItem value="ON_HOLD">Pausada</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flora-gradient-accent text-white hover:opacity-90 flora-shadow-soft">
                <Plus className="w-4 h-4 mr-2" />
                Nova história
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-[#E6C2C7] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flora-text-primary text-xl">🌷 Plantar nova história</DialogTitle>
                <p className="text-sm flora-text-secondary">
                  Comece do zero ou use um template. Tudo é editável depois — sem limitações.
                </p>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {/* Templates rápidos */}
                <div className="space-y-2">
                  <Label className="flora-text-primary text-xs uppercase tracking-wider">Templates (opcional)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "blank", label: "Em branco", emoji: "📄", desc: "Comece do zero" },
                      { key: "romance", label: "Romance", emoji: "💕", desc: "3 atos" },
                      { key: "fantasy", label: "Fantasia", emoji: "🐉", desc: "Jornada do herói" },
                      { key: "mystery", label: "Suspense", emoji: "🔍", desc: "Pistas e twist" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => {
                          if (t.key === "blank") return;
                          const templates: Record<string, { title: string; desc: string; genre: string; tone: string }> = {
                            romance: {
                              title: "",
                              desc: "Uma história de amor em três atos: encontro, conflito, resolução.",
                              genre: "Romance",
                              tone: "Emocional, intimista",
                            },
                            fantasy: {
                              title: "",
                              desc: "Uma jornada épica com sistema mágico, mentor e provações.",
                              genre: "Fantasia",
                              tone: "Épico, aventura",
                            },
                            mystery: {
                              title: "",
                              desc: "Um mistério com pistas, red herrings e reviravolta final.",
                              genre: "Suspense",
                              tone: "Tenso, investigativo",
                            },
                          };
                          if (templates[t.key]) {
                            setNewDesc(templates[t.key].desc);
                            setNewGenre(templates[t.key].genre);
                            setNewTone(templates[t.key].tone);
                            if (!newTitle.trim()) setNewTitle(".");
                          }
                        }}
                        className="p-3 rounded-xl border border-[#E6C2C7] hover:bg-[#FADADD] hover:border-[#C48D9E] transition text-center"
                      >
                        <div className="text-2xl mb-1">{t.emoji}</div>
                        <p className="text-xs font-medium flora-text-primary">{t.label}</p>
                        <p className="text-[10px] flora-text-secondary">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Título com sugestão */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flora-text-primary">Título</Label>
                    <span className="text-xs flora-text-secondary italic">
                      Não sabe? Coloque "." e peça sugestão à Flora depois
                    </span>
                  </div>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: O Jardim das Memórias Perdidas (ou apenas um .)"
                    className="border-[#E6C2C7] focus:border-[#C48D9E] text-base"
                    maxLength={120}
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label className="flora-text-primary">Sinopse / Ideia inicial</Label>
                  <Textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Escreva livremente: pode ser uma sinopse, uma ideia solta, um personagem, uma cena, ou deixe em branco para descobrir no caminho..."
                    rows={4}
                    maxLength={1000}
                    className="border-[#E6C2C7] focus:border-[#C48D9E] resize-none"
                  />
                  <p className="text-xs flora-text-secondary">{newDesc.length}/1000</p>
                </div>

                {/* Gênero + Tom + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="flora-text-primary text-xs">Gênero</Label>
                    <Input
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value)}
                      placeholder="Realismo mágico"
                      list="genres-create"
                      className="border-[#E6C2C7] focus:border-[#C48D9E]"
                    />
                    <datalist id="genres-create">
                      <option value="Realismo mágico" />
                      <option value="Romance" />
                      <option value="Fantasia" />
                      <option value="Ficção científica" />
                      <option value="Mistério" />
                      <option value="Suspense" />
                      <option value="Drama" />
                      <option value="Aventura" />
                      <option value="Terror" />
                      <option value="Histórico" />
                      <option value="Distopia" />
                      <option value="Conto" />
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label className="flora-text-primary text-xs">Tom</Label>
                    <Input
                      value={newTone}
                      onChange={(e) => setNewTone(e.target.value)}
                      placeholder="Melancólico"
                      list="tones-create"
                      className="border-[#E6C2C7] focus:border-[#C48D9E]"
                    />
                    <datalist id="tones-create">
                      <option value="Melancólico" />
                      <option value="Esperançoso" />
                      <option value="Sombrio" />
                      <option value="Leve" />
                      <option value="Contemplativo" />
                      <option value="Tenso" />
                      <option value="Lírico" />
                      <option value="Cômico" />
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label className="flora-text-primary text-xs">Status inicial</Label>
                    <Select defaultValue="DRAFT">
                      <SelectTrigger className="bg-white border-[#E6C2C7]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="IN_PROGRESS">Em progresso</SelectItem>
                        <SelectItem value="ON_HOLD">Pausada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-2">
                  <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating || !newTitle.trim()}
                    className="flora-gradient-accent text-white"
                  >
                    {isCreating ? "Plantando..." : "🌱 Plantar história"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/60 animate-pulse flora-border border" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} onDemo={handleDemo} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stories.map((story, idx) => {
              const status = STATUS_LABELS[story.status] || STATUS_LABELS.DRAFT;
              return (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => openStory(story.id)}
                  className="group relative cursor-pointer rounded-2xl bg-[#FADADD] flora-border border p-0 hover:flora-shadow-accent transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                >
                  {/* Capa (se existir) */}
                  {story.coverUrl ? (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={story.coverUrl}
                        alt={`Capa de ${story.title}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#4A2C3A]/80 via-transparent to-transparent" />
                      {/* Status badge sobre a capa */}
                      <span className={`absolute top-2 left-2 text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, story.id, story.title)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-white/80 text-[#8B6B7A] hover:text-[#D4818B] p-1 rounded-full"
                        aria-label="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {/* Título sobre a capa */}
                      <h3 className="absolute bottom-2 left-3 right-3 text-lg font-bold text-white line-clamp-2 drop-shadow-lg">
                        {story.title}
                      </h3>
                    </div>
                  ) : (
                    <>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          <button
                            onClick={(e) => handleDelete(e, story.id, story.title)}
                            className="opacity-0 group-hover:opacity-100 transition text-[#8B6B7A] hover:text-[#D4818B] p-1"
                            aria-label="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="text-lg font-bold flora-text-primary mb-2 line-clamp-2">
                          {story.title}
                        </h3>
                        <p className="text-sm flora-text-secondary line-clamp-3 mb-4 min-h-[60px]">
                          {story.description || "Sem descrição ainda."}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-4 text-xs flora-text-secondary pt-3 pb-4 px-5 border-t border-[#E6C2C7]">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {story.chaptersCount} cap.
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {story.charactersCount} pers.
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(story.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ onCreate, onDemo }: { onCreate: () => void; onDemo: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-4"
    >
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full flora-gradient-soft mb-6">
        <Flower2 className="w-12 h-12 text-[#C48D9E]" strokeWidth={1.2} />
      </div>
      <h3 className="text-2xl font-bold flora-text-primary mb-2">
        Seu jardim está esperando 🌷
      </h3>
      <p className="flora-text-secondary mb-8 max-w-md mx-auto">
        Você ainda não tem histórias. Crie a primeira ou explore uma história de exemplo
        para conhecer os recursos do Bloom Studio.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onCreate} className="flora-gradient-accent text-white flora-shadow-soft">
          <Plus className="w-4 h-4 mr-2" />
          Criar primeira história
        </Button>
        <Button onClick={onDemo} variant="outline" className="border-[#C48D9E] text-[#B24C63] hover:bg-[#FADADD]">
          <Sparkles className="w-4 h-4 mr-2" />
          Ver história de exemplo
        </Button>
      </div>
    </motion.div>
  );
}
