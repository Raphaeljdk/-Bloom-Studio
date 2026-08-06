"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Mail, Lock, User as UserIcon, Flower2, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center p-4 flora-gradient-animated-bg relative overflow-hidden">
      {/* Pétalas decorativas flutuantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {["🌸", "🎀", "🌷", "💮", "🌸", "🌷", "🎀", "💮"].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl sm:text-3xl opacity-20"
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 15, -15, 0],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{
              duration: 6 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative w-full max-w-md z-10"
      >
        {/* Card com glassmorphism */}
        <div className="flora-glass rounded-3xl flora-shadow-depth p-8 sm:p-10">
          {/* Logo animado */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl flora-gradient-accent mb-4 flora-shadow-soft flora-glow-rose">
              <Flower2 className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-serif font-bold flora-text-gradient mb-1">
              Bloom Studio
            </h1>
            <p className="flora-text-secondary text-sm">
              Estúdio de criação literária com a coautora Flora 🌸
            </p>
          </motion.div>

          {/* Tabs com indicador animado */}
          <div className="relative flex bg-white/40 rounded-full p-1 mb-6 backdrop-blur">
            <motion.div
              className="absolute top-1 bottom-1 bg-white rounded-full flora-shadow-soft"
              layout
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{
                left: mode === "login" ? "4px" : "50%",
                right: mode === "login" ? "50%" : "4px",
              }}
            />
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`relative flex-1 py-2.5 text-sm font-medium rounded-full transition-colors ${
                mode === "login" ? "text-[#B24C63]" : "flora-text-secondary"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`relative flex-1 py-2.5 text-sm font-medium rounded-full transition-colors ${
                mode === "register" ? "text-[#B24C63]" : "flora-text-secondary"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <InputField
                    icon={UserIcon}
                    type="text"
                    required
                    value={name}
                    onChange={setName}
                    placeholder="Seu nome"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField
              icon={Mail}
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="email@exemplo.com"
            />

            <InputField
              icon={Lock}
              type="password"
              required
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-sm text-[#D4818B] bg-[#FADADD]/80 rounded-lg px-3 py-2 border border-[#E6C2C7]"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl flora-gradient-accent text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 flora-shadow-soft relative overflow-hidden group"
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
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E6C2C7]/50">
            <motion.button
              onClick={demo}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 text-sm flora-text-secondary hover:flora-text-primary transition flex items-center justify-center gap-2"
            >
              <Flower2 className="w-4 h-4" />
              Ou explorar com uma conta demo
            </motion.button>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs flora-text-secondary mt-6"
        >
          🌸 Onde histórias florescem com gentileza 🌷
        </motion.p>
      </motion.div>
    </div>
  );
}

function InputField({
  icon: Icon,
  type,
  required,
  value,
  onChange,
  placeholder,
}: {
  icon: typeof Mail;
  type: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <motion.div
      whileFocus={{ scale: 1.01 }}
      className="relative group"
    >
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 flora-text-secondary group-focus-within:text-[#B24C63] transition-colors" />
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/80 backdrop-blur border border-[#E6C2C7] focus:outline-none focus:ring-2 focus:ring-[#C48D9E]/40 focus:border-[#C48D9E] text-sm flora-text-primary placeholder:flora-text-secondary transition-all flora-focus-ring"
      />
    </motion.div>
  );
}
