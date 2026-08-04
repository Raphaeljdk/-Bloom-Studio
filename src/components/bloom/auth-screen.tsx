"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, User as UserIcon, Flower2 } from "lucide-react";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = (window as unknown as { __bloomAuth?: { login?: (e?: string, p?: string, n?: string) => Promise<unknown> } }).__bloomAuth;
      if (!auth?.login) throw new Error("Auth não inicializado");
      if (mode === "register") {
        await auth.login(email, password, name);
      } else {
        await auth.login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const demo = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = (window as unknown as { __bloomAuth?: { login?: () => Promise<unknown> } }).__bloomAuth;
      await auth?.login?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar no demo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 flora-bg-primary flora-pattern">
      {/* Pétalas decorativas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-4xl opacity-20 flora-petal-float">🌸</div>
        <div className="absolute top-1/4 right-16 text-3xl opacity-15 flora-petal-float" style={{ animationDelay: "1s" }}>🎀</div>
        <div className="absolute bottom-20 left-1/4 text-4xl opacity-20 flora-petal-float" style={{ animationDelay: "2s" }}>🌷</div>
        <div className="absolute bottom-1/3 right-1/4 text-3xl opacity-15 flora-petal-float" style={{ animationDelay: "0.5s" }}>💮</div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-3xl flora-shadow-accent p-8 flora-border border">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl flora-gradient-accent mb-4 flora-shadow-soft">
              <Flower2 className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-serif font-bold flora-text-primary mb-1">
              Bloom Studio
            </h1>
            <p className="flora-text-secondary text-sm">
              Estúdio de criação literária com a coautora Flora 🌸
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#FADADD] rounded-full p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition ${
                mode === "login" ? "bg-white flora-text-primary shadow" : "flora-text-secondary"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition ${
                mode === "register" ? "bg-white flora-text-primary shadow" : "flora-text-secondary"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flora-text-secondary" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FDF2F0] border border-[#E6C2C7] focus:outline-none focus:ring-2 focus:ring-[#C48D9E] text-sm flora-text-primary placeholder:flora-text-secondary"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flora-text-secondary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FDF2F0] border border-[#E6C2C7] focus:outline-none focus:ring-2 focus:ring-[#C48D9E] text-sm flora-text-primary placeholder:flora-text-secondary"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flora-text-secondary" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FDF2F0] border border-[#E6C2C7] focus:outline-none focus:ring-2 focus:ring-[#C48D9E] text-sm flora-text-primary placeholder:flora-text-secondary"
              />
            </div>

            {error && (
              <p className="text-sm text-[#D4818B] bg-[#FADADD] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl flora-gradient-accent text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 flora-shadow-soft"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aguarde...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {mode === "login" ? "Entrar no jardim" : "Começar a escrever"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E6C2C7]">
            <button
              onClick={demo}
              disabled={loading}
              className="w-full py-2.5 text-sm flora-text-secondary hover:flora-text-primary transition flex items-center justify-center gap-2"
            >
              <Flower2 className="w-4 h-4" />
              Ou explorar com uma conta demo
            </button>
          </div>
        </div>

        <p className="text-center text-xs flora-text-secondary mt-6">
          🌸 Onde histórias florescem com gentileza 🌷
        </p>
      </motion.div>
    </div>
  );
}
