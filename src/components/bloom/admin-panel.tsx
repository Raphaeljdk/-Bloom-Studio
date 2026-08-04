"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, BookOpen, MessageCircle, TrendingUp,
  Shield, Trash2, Crown, User as UserIcon, Calendar, Sparkles, Flower2, LogOut
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const api = {
  getStats: () => fetch("/api/admin/stats").then((r) => r.json()),
  getUsers: () => fetch("/api/admin/users").then((r) => r.json()),
  getStories: () => fetch("/api/admin/stories").then((r) => r.json()),
  updateUserRole: (userId: string, role: string) =>
    fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }),
  deleteUser: (userId: string) =>
    fetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
};

interface Stats {
  counts: { users: number; stories: number; chapters: number; characters: number; messages: number };
  storiesByDay: Array<{ date: string; count: number }>;
  topUsers: Array<{ id: string; name: string; email: string; role: string; storiesCount: number; createdAt: string }>;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  storiesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminStory {
  id: string;
  title: string;
  description: string | null;
  status: string;
  genre: string | null;
  coverUrl: string | null;
  chaptersCount: number;
  charactersCount: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
}

type Tab = "overview" | "users" | "stories";

export function AdminPanel() {
  const setView = useUIStore((s) => s.setView);
  const [tab, setTab] = useState<Tab>("overview");
  const qc = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: api.getStats,
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: api.getUsers,
    enabled: tab === "users",
  });

  const storiesQuery = useQuery({
    queryKey: ["admin", "stories"],
    queryFn: api.getStories,
    enabled: tab === "stories",
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.updateUserRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Role atualizado");
    },
    onError: () => toast.error("Erro ao atualizar role"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.info("Usuário removido");
    },
  });

  const handleDeleteUser = (userId: string, name: string) => {
    if (!confirm(`Remover usuário "${name}" e TODAS as suas histórias? Esta ação não pode ser desfeita.`)) return;
    deleteUserMutation.mutate(userId);
  };

  const stats = statsQuery.data as Stats | undefined;
  const usersRaw = usersQuery.data as AdminUser[] | { error?: string } | undefined;
  const storiesRaw = storiesQuery.data as AdminStory[] | { error?: string } | undefined;
  const users = Array.isArray(usersRaw) ? usersRaw : [];
  const stories = Array.isArray(storiesRaw) ? storiesRaw : [];

  // Null-safe para evitar crash quando query ainda carregando
  const storiesByDay = stats?.storiesByDay || [];
  const topUsers = stats?.topUsers || [];
  const counts = stats?.counts || { users: 0, stories: 0, chapters: 0, characters: 0, messages: 0 };
  const maxDayCount = Math.max(...storiesByDay.map((d) => d.count), 1);

  const handleLogout = async () => {
    const auth = (window as unknown as { __bloomAuth?: { logout?: () => Promise<void> } }).__bloomAuth;
    await auth?.logout?.();
  };

  return (
    <div className="min-h-screen flora-bg-primary flora-pattern">
      {/* Header */}
      <header className="border-b border-[#E6C2C7] bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button onClick={() => setView("dashboard")} variant="ghost" size="sm" className="text-[#8B6B7A]">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <div className="h-6 w-px bg-[#E6C2C7] hidden sm:block" />
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#4A2C3A] to-[#B24C63] flex items-center justify-center flora-shadow-soft flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold flora-text-primary truncate">Painel Admin</h1>
              <p className="text-xs flora-text-secondary hidden sm:block">Gerencie usuários e histórias</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-[#8B6B7A] hover:text-[#B24C63]">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/60 rounded-2xl p-1 mb-6 flora-border border w-fit">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={TrendingUp} label="Visão geral" />
          <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users} label="Usuários" />
          <TabButton active={tab === "stories"} onClick={() => setTab("stories")} icon={BookOpen} label="Histórias" />
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <StatCard icon={<Users className="w-5 h-5" />} label="Usuários" value={counts.users} color="rose" />
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="Histórias" value={counts.stories} color="sage" />
              <StatCard icon={<BookOpen className="w-5 h-5" />} label="Capítulos" value={counts.chapters} color="gold" />
              <StatCard icon={<UserIcon className="w-5 h-5" />} label="Personagens" value={counts.characters} color="rose" />
              <StatCard icon={<MessageCircle className="w-5 h-5" />} label="Mensagens" value={counts.messages} color="sage" />
            </div>

            {/* Gráfico de histórias por dia */}
            <div className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6">
              <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Histórias criadas (últimos 7 dias)
              </h3>
              {stats && (
                <div className="flex items-end justify-between gap-2 h-40">
                  {storiesByDay.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full flora-gradient-accent rounded-t-lg transition-all duration-500 hover:opacity-80"
                          style={{ height: `${(d.count / maxDayCount) * 100}%`, minHeight: d.count > 0 ? "8px" : "2px" }}
                          title={`${d.count} histórias`}
                        />
                      </div>
                      <span className="text-xs flora-text-secondary">
                        {new Date(d.date).toLocaleDateString("pt-BR", { weekday: "short" })}
                      </span>
                      <span className="text-xs font-bold flora-text-primary">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top usuários */}
            <div className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6">
              <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#E8C98B]" />
                Top escritores
              </h3>
              <div className="space-y-2">
                {topUsers.map((u, idx) => (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#FDF2F0] transition">
                    <span className={`text-lg font-bold w-6 ${idx === 0 ? "text-[#E8C98B]" : idx === 1 ? "text-[#C48D9E]" : "text-[#8B6B7A]"}`}>
                      {idx + 1}º
                    </span>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-[#FADADD] text-[#B24C63] text-xs">
                        {u.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium flora-text-primary truncate">{u.name}</p>
                      <p className="text-xs flora-text-secondary truncate">{u.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#FADADD] text-[#B24C63] font-medium">
                      {u.storiesCount} histórias
                    </span>
                    {u.role === "ADMIN" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-[#4A2C3A] to-[#B24C63] text-white font-medium flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Users tab */}
        {tab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6"
          >
            <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Todos os usuários ({users.length})
            </h3>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-[#FDF2F0] hover:bg-[#FADADD] transition">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-[#C48D9E] to-[#B24C63] text-white">
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium flora-text-primary">{u.name}</p>
                      {u.role === "ADMIN" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-[#4A2C3A] to-[#B24C63] text-white font-medium flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs flora-text-secondary">{u.email}</p>
                    <div className="flex items-center gap-3 text-xs flora-text-secondary mt-1">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {u.storiesCount} histórias
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Entrou em {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateRoleMutation.mutate({
                          userId: u.id,
                          role: u.role === "ADMIN" ? "USER" : "ADMIN",
                        })
                      }
                      disabled={updateRoleMutation.isPending}
                      className="border-[#C48D9E] text-[#B24C63] hover:bg-[#FADADD] text-xs"
                    >
                      {u.role === "ADMIN" ? "Rebaixar" : "Promover"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="text-[#D4818B] hover:bg-[#FADADD] text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center py-8 flora-text-secondary text-sm">Nenhum usuário ainda.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Stories tab */}
        {tab === "stories" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl flora-shadow-soft flora-border border p-4 sm:p-6"
          >
            <h3 className="font-bold flora-text-primary mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Todas as histórias ({stories.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stories.map((s) => (
                <div key={s.id} className="rounded-xl bg-[#FADADD] flora-border border overflow-hidden">
                  {s.coverUrl ? (
                    <div className="h-32 overflow-hidden">
                      <img src={s.coverUrl} alt={s.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-[#FADADD] to-[#E6C2C7] flex items-center justify-center">
                      <Flower2 className="w-8 h-8 text-[#C48D9E]" />
                    </div>
                  )}
                  <div className="p-3">
                    <h4 className="font-bold flora-text-primary text-sm line-clamp-2">{s.title}</h4>
                    <p className="text-xs flora-text-secondary mt-1 line-clamp-2">{s.description || "Sem descrição"}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-[#FADADD] text-[#B24C63]">
                        {s.status}
                      </span>
                      <span className="flora-text-secondary">{s.chaptersCount} cap.</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E6C2C7]">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className="bg-[#C48D9E] text-white text-[10px]">
                          {s.user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs flora-text-secondary truncate">{s.user.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition ${
        active
          ? "bg-white flora-shadow-soft text-[#B24C63]"
          : "text-[#8B6B7A] hover:text-[#B24C63]"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "rose" | "sage" | "gold";
}) {
  const colors = {
    rose: { bg: "bg-[#FADADD]", icon: "text-[#B24C63]", value: "text-[#B24C63]" },
    sage: { bg: "bg-[#D4E8DC]", icon: "text-[#5A8870]", value: "text-[#5A8870]" },
    gold: { bg: "bg-[#F4E4BC]", icon: "text-[#8B6B3A]", value: "text-[#8B6B3A]" },
  };
  const c = colors[color];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`${c.bg} rounded-2xl p-3 sm:p-4 flora-border border`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-wider font-medium text-[#8B6B7A]">{label}</p>
        <span className={c.icon}>{icon}</span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${c.value}`}>{value.toLocaleString("pt-BR")}</p>
    </motion.div>
  );
}
