"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Check, X, Flower2, RefreshCw, Copy, MessageCircle, Lightbulb, BookOpen, Wand2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { VoiceInput } from "./voice-input";
import { FormattedMessage } from "./formatted-message";
import { AddToDocumentDialog } from "./add-to-document-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props { storyId: string }

export function CoauthorChat({ storyId }: Props) {
  const { messages, isLoading, isFloraTyping, send, isSending, approveSuggestion, rejectSuggestion, decideProposal, isDecidingProposal } = useChat(storyId);
  const [input, setInput] = useState("");
  const [addDialogContent, setAddDialogContent] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
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

  const quickActions = [
    { label: "Criar ideias", prompt: "Me ajude a encontrar três caminhos criativos para a próxima cena.", icon: Lightbulb },
    { label: "Revisar texto", prompt: "Analise a coerência e o ritmo do capítulo atual sem alterar minha história.", icon: BookOpen },
    { label: "Desenvolver trama", prompt: "Quais conflitos e motivações posso aprofundar nesta história?", icon: Wand2 },
    { label: "Checar coerência", prompt: "Faça uma auditoria de coerência da minha Bíblia da História: personagens, relações, cronologia e capítulos. Cite fatos específicos, destaque contradições e não altere nada sem minha aprovação.", icon: BookOpen },
  ];

  return (
    <div className="h-full min-w-0 flex flex-col bg-white">
      {/* Header da Flora */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#E6C2C7] bg-gradient-to-r from-[#FFF4F4] to-[#FADADD]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl flora-gradient-accent flex items-center justify-center text-xl shadow-sm">
              🌸
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7EB8A2] border-2 border-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold flora-text-primary flex items-center gap-1.5">
              Flora <span className="text-[10px] font-medium rounded-full bg-white/80 px-2 py-0.5 text-[#B24C63]">Coautora IA</span>
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
                "Pronta para criar com você"
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

                    {m.role === "ASSISTANT" && (
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(m.content)
                            .then(() => toast.success("Resposta da Flora copiada"))
                            .catch(() => toast.error("Não foi possível copiar"));
                        }}
                        className="mt-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs flora-text-secondary transition hover:bg-[#FADADD] hover:text-[#B24C63]"
                        aria-label="Copiar resposta da Flora"
                      >
                        <Copy className="h-3 w-3" /> Copiar resposta
                      </button>
                    )}

                    {/* Botão "Adicionar ao documento" para respostas da Flora */}
                    {m.role === "ASSISTANT" && m.content.trim().length > 20 && !m.suggestion && (
                      <button
                        onClick={() => {
                          setAddDialogContent(m.content);
                          setAddDialogOpen(true);
                        }}
                        className="mt-1 text-xs px-2 py-1 rounded-full bg-white/60 text-[#8B6B7A] hover:bg-[#FADADD] hover:text-[#B24C63] transition flex items-center gap-1"
                        title="Adicionar este trecho ao documento da história"
                      >
                        <Sparkles className="w-3 h-3" />
                        Adicionar ao documento
                      </button>
                    )}

                    {m.proposals && m.proposals.length > 0 && (
                      <div className="mt-2 w-full space-y-2">
                        {m.proposals.map(proposal => (
                          <div key={proposal.id} className="rounded-xl border border-[#E6C2C7] bg-[#FFF6F3] p-3 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#B24C63]">
                              <Sparkles className="h-4 w-4" /> Proposta de alteração
                            </div>
                            <p className="mb-2 break-words text-sm flora-text-primary">{proposal.description}</p>
                            {proposal.status === "PENDING" ? (
                              <>
                                <p className="mb-3 text-xs flora-text-secondary">Nenhuma mudança será feita sem sua confirmação.</p>
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" disabled={isDecidingProposal}
                                    onClick={() => void decideProposal({ id: proposal.id, decision: "APPROVED" })}
                                    className="flex-1 bg-[#7EB8A2] text-white hover:bg-[#6BA890]">
                                    <Check className="mr-1 h-3.5 w-3.5" /> Aprovar e aplicar
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" disabled={isDecidingProposal}
                                    onClick={() => void decideProposal({ id: proposal.id, decision: "REJECTED" })}
                                    className="flex-1 border-[#E6C2C7] text-[#8B6B7A]">
                                    <X className="mr-1 h-3.5 w-3.5" /> Recusar
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <p className="flex items-center gap-1 text-xs font-semibold text-[#6B8D7D]">
                                {proposal.status === "APPROVED" ? "✓ Aprovada e aplicada" : "Proposta recusada"}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

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
      <div className="flex-shrink-0 border-t border-[#E6C2C7] bg-white p-3">
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Sugestões rápidas">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.label} type="button" onClick={() => setInput(action.prompt)}
                disabled={isSending}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E6C2C7] bg-[#FDF2F0] px-3 py-1.5 text-xs font-medium text-[#87495E] transition hover:border-[#C48D9E] hover:bg-[#FADADD] disabled:opacity-50">
                <Icon className="h-3.5 w-3.5" /> {action.label}
              </button>
            );
          })}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Peça uma ideia, revisão ou ajuda com uma cena..."
            aria-label="Mensagem para a Flora"
            rows={1}
            className="bg-[#FDF2F0] border-[#E6C2C7] focus:border-[#C48D9E] focus:ring-[#C48D9E] resize-none min-h-[44px] max-h-32 text-sm"
          />
          <VoiceInput
            onTranscript={(text) => setInput((prev) => (prev ? prev + " " + text : text))}
            disabled={isSending}
          />
          <Button
            type="submit"
            aria-label={isSending ? "Flora está respondendo" : "Enviar mensagem"}
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
          <MessageCircle className="mr-1 inline h-3 w-3" /> Enter envia · Shift+Enter quebra linha · Você aprova as sugestões
        </p>
      </div>

      {/* Modal "Adicionar ao documento" */}
      <AddToDocumentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        storyId={storyId}
        initialContent={addDialogContent}
      />
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
