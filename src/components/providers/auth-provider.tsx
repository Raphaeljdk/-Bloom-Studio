"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useUIStore } from "@/stores/ui-store";
import { api } from "@/lib/api-client";

interface AuthState {
  loading: boolean;
  user: { id: string; name: string; email: string } | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setView = useUIStore((s) => s.setView);
  const [auth, setAuth] = useState<AuthState>({ loading: true, user: null });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setAuth({ loading: false, user: data.user });
          setView("dashboard");
        } else {
          setAuth({ loading: false, user: null });
          setView("auth");
        }
      })
      .catch(() => setAuth({ loading: false, user: null }));
  }, []);

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
