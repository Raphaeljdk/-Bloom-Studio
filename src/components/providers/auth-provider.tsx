"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useStoryStore } from "@/stores/story-store";
import { useChatStore } from "@/stores/chat-store";

interface AuthState {
  loading: boolean;
  user: { id: string; name: string; email: string } | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setView = useUIStore((s) => s.setView);
  const [auth, setAuth] = useState<AuthState>({ loading: true, user: null });

  // Verifica sessão existente ao montar
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.user) {
          setAuth({ loading: false, user: data.user });
          setView("dashboard");
        } else {
          // Sem sessão → entra como demo automaticamente (sem fricção)
          fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })
            .then((r) => r.json())
            .then((u) => {
              if (cancelled) return;
              if (u && u.id) {
                setAuth({ loading: false, user: u });
                setView("dashboard");
              } else {
                setAuth({ loading: false, user: null });
                setView("auth");
              }
            })
            .catch(() => {
              if (cancelled) return;
              setAuth({ loading: false, user: null });
              setView("auth");
            });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAuth({ loading: false, user: null });
        setView("auth");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Escuta evento global de 401 (despachado pelo api-client)
  // Reseta gracioso: limpa stores + volta para tela de auth
  useEffect(() => {
    const handleUnauthorized = () => {
      setAuth({ loading: false, user: null });
      setView("auth");
      useStoryStore.getState().reset();
      useChatStore.getState().clear();
    };
    window.addEventListener("bloom:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("bloom:unauthorized", handleUnauthorized);
  }, [setView]);

  const login = async (email?: string, password?: string, name?: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erro ao entrar");
    }
    const user = await res.json();
    setAuth({ loading: false, user });
    setView("dashboard");
    return user;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuth({ loading: false, user: null });
    setView("auth");
    useStoryStore.getState().reset();
    useChatStore.getState().clear();
  };

  // Expor via window para os componentes acessarem sem prop drilling
  useEffect(() => {
    (window as unknown as { __bloomAuth?: typeof auth & { login?: typeof login; logout?: typeof logout } }).__bloomAuth = {
      ...auth,
      login,
      logout,
    };
  }, [auth]);

  // Loading inicial
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flora-bg-primary">
        <div className="text-center">
          <div className="text-5xl flora-petal-float mb-4">🌸</div>
          <p className="flora-text-secondary text-sm">Carregando Bloom Studio...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
