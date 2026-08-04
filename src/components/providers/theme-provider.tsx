"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName = "rose" | "dark" | "forest" | "ocean";

interface ThemeConfig {
  name: ThemeName;
  label: string;
  emoji: string;
}

export const THEMES: ThemeConfig[] = [
  { name: "rose", label: "Rosa Romântico", emoji: "🌸" },
  { name: "dark", label: "Noturno", emoji: "🌙" },
  { name: "forest", label: "Bosque Verde", emoji: "🌿" },
  { name: "ocean", label: "Azul Sereno", emoji: "🌊" },
];

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "rose",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initial state — lê do localStorage uma única vez no mount
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "rose";
    const saved = localStorage.getItem("bloom-theme") as ThemeName | null;
    return saved && THEMES.some((t) => t.name === saved) ? saved : "rose";
  });

  // Aplica tema no <html> e persiste
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("bloom-theme", theme);
    }
  }, [theme]);

  const setTheme = (t: ThemeName) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
