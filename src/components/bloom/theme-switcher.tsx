"use client";

import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme, THEMES, type ThemeName } from "@/components/providers/theme-provider";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-[#8B6B7A] hover:text-[#B24C63] hover:bg-[#FADADD] gap-1.5"
          title="Trocar tema visual"
        >
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Tema</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-white border-[#E6C2C7]" align="end">
        <p className="text-xs font-medium flora-text-secondary uppercase tracking-wider px-2 py-1.5">
          Tema visual
        </p>
        <div className="space-y-0.5">
          {THEMES.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                setTheme(t.name as ThemeName);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition ${
                theme === t.name
                  ? "bg-[#FADADD] text-[#B24C63] font-medium"
                  : "text-[#4A2C3A] hover:bg-[#FDF2F0]"
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              <span className="flex-1 text-left">{t.label}</span>
              {theme === t.name && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
