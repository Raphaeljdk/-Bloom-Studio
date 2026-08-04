"use client";

import { useEffect } from "react";

/**
 * Error boundary global do Next.js App Router.
 * Captura erros que escapam dos Error Boundaries de componentes.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Bloom Studio] Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 flora-bg-primary flora-pattern">
      <div className="max-w-md w-full bg-white rounded-3xl flora-shadow-accent p-8 flora-border border text-center">
        <div className="text-5xl mb-4">🌷</div>
        <h1 className="text-2xl font-bold flora-text-primary mb-2">
          Ops! Algo floresceu de forma inesperada
        </h1>
        <p className="text-sm flora-text-secondary mb-6">
          Ocorreu um erro ao carregar o Bloom Studio. Não se preocupe —
          suas histórias estão salvas. Tente novamente.
        </p>

        <details className="text-left mb-6 bg-[#FDF2F0] rounded-xl p-3 text-xs">
          <summary className="cursor-pointer flora-text-secondary font-medium">
            Detalhes técnicos
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-all flora-text-primary">
            {error.message || "Erro desconhecido"}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
        </details>

        <button
          onClick={reset}
          className="w-full py-3 rounded-xl flora-gradient-accent text-white font-medium hover:opacity-90 transition flora-shadow-soft"
        >
          🌸 Tentar novamente
        </button>
      </div>
    </div>
  );
}
