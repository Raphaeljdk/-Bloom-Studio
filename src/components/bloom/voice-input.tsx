"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Estende os tipos do TypeScript para Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: {
      length: number;
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Não suportado — botão não aparece
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: Event) => {
      const err = event as Event & { error?: string };
      if (err.error === "not-allowed") {
        toast.error("Permissão de microfone negada. Habilite nas configurações do navegador.");
      } else if (err.error === "no-speech") {
        // Silêncio — ignora
      } else if (err.error) {
        toast.error(`Erro no ditado: ${err.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript]);

  const toggle = () => {
    if (!recognitionRef.current) {
      toast.error("Seu navegador não suporta ditado por voz. Tente Chrome ou Edge.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
        toast.success("🎤 Ouvindo... fale sua mensagem");
      } catch {
        // Já está ouvindo
      }
    }
  };

  // Não renderiza se não suportado
  if (typeof window !== "undefined") {
    const supported =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!supported) return null;
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      disabled={disabled}
      variant="ghost"
      size="icon"
      className={`flex-shrink-0 h-11 w-11 p-0 transition ${
        listening
          ? "bg-[#D4818B] text-white hover:bg-[#B24C63] flora-pulse"
          : "text-[#8B6B7A] hover:text-[#B24C63] hover:bg-[#FADADD]"
      }`}
      title={listening ? "Parar ditado" : "Ditar por voz"}
    >
      {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
}
