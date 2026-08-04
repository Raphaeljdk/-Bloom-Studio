"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary global — captura qualquer erro de renderização client-side
 * e mostra uma tela graciosa em vez do "Application error" padrão do Next.js.
 *
 * Permite que o usuário tente novamente sem precisar recarregar manualmente.
 */
export class GlobalErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log estruturado para debug
    console.error("[Bloom Studio] Erro capturado:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Recarrega a página para garantir estado limpo
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Erro desconhecido";
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
                {errorMessage}
              </pre>
            </details>

            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-xl flora-gradient-accent text-white font-medium hover:opacity-90 transition flora-shadow-soft"
            >
              🌸 Recomeçar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
