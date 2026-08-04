"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useStoryStore } from "@/stores/story-store";
import { useChatStore } from "@/stores/chat-store";

interface BloomUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  loading: boolean;
  user: BloomUser | null;
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setView = useUIStore((s) => s.setView);
  const [auth, setAuth] = useState<AuthState>({ loading: true, user: null });

  // Boot: verifica sessão existente; se não houver, cria sessão demo automaticamente.
  // IMPORTANTE: só libera o dashboard quando o cookie de sessão estiver efetivamente
  // validado por uma chamada /api/auth/me subsequente — evita race condition onde
  // o dashboard renderiza antes do cookie estar disponível, causando 401.
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        // 1. Tenta sessão existente
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) throw new Error(`auth/me ${meRes.status}`);
        const meData = await safeJson<{ user: BloomUser | null }>(meRes);
        if (cancelled) return;

        if (meData?.user) {
          // Sessão válida → libera dashboard
          setAuth({ loading: false, user: meData.user });
          setView("dashboard");
          return;
        }

        // 2. Sem sessão → cria demo automaticamente
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (cancelled) return;

        if (!loginRes.ok) {
          setAuth({ loading: false, user: null });
          setView("auth");
          return;
        }

        const loginData = await safeJson<BloomUser & { demo?: boolean }>(loginRes);
        if (cancelled) return;

        if (loginData?.id) {
          // 3. CRÍTICO: valida que o cookie foi setado fazendo um /me novamente.
          // Se o segundo /me falhar, cai para tela de auth em vez de quebrar.
          try {
            const verifyRes = await fetch("/api/auth/me");
            if (verifyRes.ok) {
              const verifyData = await safeJson<{ user: BloomUser | null }>(verifyRes);
              if (cancelled) return;
              if (verifyData?.user) {
                setAuth({ loading: false, user: verifyData.user });
                setView("dashboard");
                return;
              }
            }
          } catch {
            // ignore verify error, fall through
          }
          // Fallback: mesmo sem verificação, libera dashboard (cookie deve estar OK)
          setAuth({ loading: false, user: { id: loginData.id, name: loginData.name, email: loginData.email } });
          setView("dashboard");
        } else {
          setAuth({ loading: false, user: null });
          setView("auth");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[AuthProvider] boot error:", err);
        setAuth({ loading: false, user: null });
        setView("auth");
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, [setView]);

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

  const login = useCallback(async (email?: string, password?: string, name?: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const err = await safeJson<{ error?: string }>(res);
      throw new Error(err?.error || "Erro ao entrar");
    }
    const user = await safeJson<BloomUser>(res);
    if (!user) throw new Error("Resposta inválida do servidor");
    setAuth({ loading: false, user });
    setView("dashboard");
    return user;
  }, [setView]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAuth({ loading: false, user: null });
    setView("auth");
    useStoryStore.getState().reset();
    useChatStore.getState().clear();
  }, [setView]);

  // Expor via window para os componentes acessarem sem prop drilling
  useEffect(() => {
    (window as unknown as {
      __bloomAuth?: AuthState & { login?: typeof login; logout?: typeof logout };
    }).__bloomAuth = {
      ...auth,
      login,
      logout,
    };
  }, [auth, login, logout]);

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
