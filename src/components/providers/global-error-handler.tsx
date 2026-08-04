"use client";

import { useEffect } from "react";

/**
 * Captura erros não tratados no cliente (window.onerror e unhandledrejection).
 * Loga estruturado para debug, sem quebrar a UI.
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("[Bloom Studio] Unhandled error:", event.error || event.message);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[Bloom Studio] Unhandled rejection:", event.reason);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
