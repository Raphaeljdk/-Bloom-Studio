"use client";

import { useEffect } from "react";

/**
 * Registra o service worker para PWA (instalação no celular + offline).
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && window.location.hostname === "localhost") {
      // Em dev não registra (evita cache confuso), mas registra em preview
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[PWA] SW registration failed:", err));
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
