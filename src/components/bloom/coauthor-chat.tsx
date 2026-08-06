"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Check, X, Flower2, RefreshCw } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { VoiceInput } from "./voice-input";
import { FormattedMessage } from "./formatted-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props { storyId: string }

export function CoauthorChat({ storyId }: Props) {
  const { messages, isLoading, isFloraTyping, send, isSending, approveSuggestion, rejectSuggestion } = useChat(storyId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o final
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isFloraTyping]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isSending) return;
    const msg = input;
    setInput("");
    try {
      await send(msg);
    } catch (err) {
      setInput(msg); // restaura em caso de erro
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      await approveSuggestion(eventId);
    } catch (err) {
      toast.error("Erro ao aprovar sugestão");
    }
  };

  const handleReject = async (eventId: string) => {
    try {
      await rejectSuggestion(eventId);
    } catch (err) {
      toast.error("Erro ao recusar sugestão");
    }
  };

  const suggestions = [
    "Me dê ideias de histórias",
    "Quais perguntas devo fazer sobre meu protagonista?",
    "Pode sugerir um acontecimento importante?",
    "Analise a estrutura da minha história",
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header da Flora */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#E6C2C7] bg-gradient-to-r from-[#FADADD] to-[#E6C2C7]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full flora-gradient-accent flex items-center justify-center text-xl">
              🌸
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7EB8A2] border-2 border-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold flora-text-primary flex items-center gap-1.5">
              Flora
              <Flower2 className="w-3.5 h-3.5 text-[#B24C63]" />
            </h2>
            <p className="text-xs flora-text-secondary">
              {isFloraTyping ? (
                <span className="flex items-center gap-1 text-[#B24C63]">
                  digitando
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#B24C63] flora-typing-dot" />
                    <span className="w-1 h-1 rounded-full bg-[#B24C63] flora-typing-dot" />
                    <span className="w-1 h-1 rounded-full bg-[#B24C63] flora-typing-dot" />
                  </span>
                </span>
              ) : (
                "Coautora disponível"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-5 h-5 text-[#C48D9E] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <WelcomeScreen onSuggestion={(s) => setInput(s)} suggestions={suggestions} />
        ) : (
          <AnimatePresence initial={false}>
            {messages
              .filter((m) => m.role !== "SYSTEM")
              .map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] ${m.role === "USER" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {m.role === "ASSISTANT" && (
                      <span className="text-xs flora-text-secondary px-2 flex items-center gap-1">
                        <Flower2 className="w-3 h-3" />
                        Flora
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
                        m.role === "USER"
                          ? "bg-[#D4818B] text-white rounded-br-md whitespace-pre-wrap"
                          : "bg-[#FADADD] flora-text-primary rounded-bl-md flora-border border"
                      }`}
                    >
                      {m.role === "ASSISTANT" ? (
                        <FormattedMessage content={m.content} />
                      ) : (
                        m.content
                      )}
                    </div>

                    {/* Card de sugestão pendente */}
                    {m.suggestion && !m.suggestion.isApproved && !m.suggestion.isRejected && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 w-full max-w-sm bg-gradient-to-br from-[#FADADD] to-[#E6C2C7] rounded-2xl p-4 flora-border border flora-shadow-soft"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-[#B24C63]" />
                          </div>
                          <span className="text-xs font-semibold text-[#B24C63] uppercase tracking-wide">
                            Sugestão de evento importante
                          </span>
                        </div>
                        <h4 className="font-bold flora-text-primary text-sm mb-1">
                          {m.suggestion.title}
                        </h4>
                        <p className="text-xs flora-text-primary mb-2">
                          {m.suggestion.description}
                        </p>
                        {m.suggestion.impact && (
                          <p className="text-xs flora-text-secondary italic mb-3">
                            <span className="font-medium not-italic">Impacto:</span> {m.suggestion.impact}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(m.suggestion!.id)}
                            className="bg-[#7EB8A2] text-white hover:bg-[#6BA890] flex-1"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(m.suggestion!.id)}
                            className="text-[#8B6B7A] hover:text-[#D4818B] hover:bg-white/40 flex-1 border border-[#E6C2C7]"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Recusar
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* Badge de sugestão resolvida */}
                    {m.suggestion && (m.suggestion.isApproved || m.suggestion.isRejected) && (
                      <div className={`mt-1 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        m.suggestion.isApproved
                          ? "bg-[#D4E8DC] text-[#5A8870]"
                          : "bg-[#F4E4BC] text-[#8B6B3A]"
                      }`}>
                        {m.suggestion.isApproved ? (
                          <><Check className="w-3 h-3" /> Evento aprovado e adicionado</>
                        ) : (
                          <><X className="w-3 h-3" /> Sugestão recusada</>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        )}

        {/* Indicador de digitando */}
        {isFloraTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-[#FADADD] flora-border border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
              <span className="text-xs flora-text-secondary mr-1">Flora está pensando</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B24C63] flora-typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#B24C63] flora-typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#B24C63] flora-typing-dot" />
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-[#E6C2C7] bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Converse com a Flora sobre sua história..."
            rows={1}
            className="bg-[#FDF2F0] border-[#E6C2C7] focus:border-[#C48D9E] focus:ring-[#C48D9E] resize-none min-h-[44px] max-h-32 text-sm"
          />
          <VoiceInput
            onTranscript={(text) => setInput((prev) => (prev ? prev + " " + text : text))}
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isSending}
            className="flora-gradient-accent text-white hover:opacity-90 h-11 w-11 p-0 flex-shrink-0"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-xs flora-text-secondary mt-1.5 text-center">
          🌸 A Flora tem acesso a todo o contexto da sua história · 🎤 Ditado disponível
        </p>
      </div>
    </div>
  );
}

function WelcomeScreen({
  onSuggestion,
  suggestions,
}: {
  onSuggestion: (s: string) => void;
  suggestions: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full flex flex-col items-center justify-center text-center px-4 py-8"
    >
      <div className="w-16 h-16 rounded-3xl flora-gradient-accent flex items-center justify-center text-3xl mb-4 flora-shadow-soft">
        🌸
      </div>
      <h3 className="font-bold flora-text-primary text-lg mb-1">Olá! Sou a Flora 🌷</h3>
      <p className="text-sm flora-text-secondary mb-6 max-w-xs">
        Sua coautora no Bloom Studio. Você escreve — eu auxilio com ideias,
        perguntas e sugestões para desenvolver sua história.
      </p>
      <div className="w-full space-y-2">
        <p className="text-xs flora-text-secondary uppercase tracking-wider mb-2">
          Sugestões para começar
        </p>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s)}
            className="w-full text-left text-sm bg-[#FADADD] hover:bg-[#E6C2C7] transition rounded-xl px-3 py-2 flora-border border flora-text-primary"
          >
            {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
