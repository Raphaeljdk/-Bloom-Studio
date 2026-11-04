"use client";

import { useState } from "react";
import { Download, FileText, FileCode, FileType, Braces, Printer, Loader2, ShieldCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { exportMarkdown, exportHTML, exportPDF, exportTXT, exportJSON } from "@/lib/export-utils";
import { toast } from "sonner";

interface Props {
  storyId: string;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

export function ExportMenu({ storyId, variant = "ghost", size = "sm", className = "", label = "Exportar" }: Props) {
  const [loading, setLoading] = useState(false);

  const fetchStory = async () => {
    setLoading(true);
    try {
      const data = (await api.getStory(storyId)) as Parameters<typeof exportMarkdown>[0];
      return data;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar história");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadFullBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stories/${storyId}/backup`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível exportar o backup");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const element = document.createElement("a");
      element.href = url;
      element.download = `bloom-backup-${storyId}.json`;
      document.body.appendChild(element);
      element.click();
      element.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast.success("Backup completo disponível para salvar no seu dispositivo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no backup");
    } finally { setLoading(false); }
  };

  const handle = async (format: "md" | "html" | "pdf" | "txt" | "json") => {
    const story = await fetchStory();
    if (!story) return;
    try {
      if (format === "md") { exportMarkdown(story); toast.success("Markdown exportado 🌸"); }
      else if (format === "html") { exportHTML(story); toast.success("HTML exportado 🌸"); }
      else if (format === "pdf") { exportPDF(story); toast.success("Abrindo impressão/PDF 🌸"); }
      else if (format === "txt") { exportTXT(story); toast.success("Texto exportado 🌸"); }
      else if (format === "json") { exportJSON(story); toast.success("Backup JSON exportado 🌸"); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={loading}
          className={className}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          <span className="hidden sm:inline">{loading ? "Preparando..." : label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-white border-[#E6C2C7]">
        <DropdownMenuLabel className="text-[#8B6B7A] text-xs uppercase tracking-wider">
          Formatos de exportação
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#E6C2C7]" />
        <DropdownMenuItem onClick={() => handle("pdf")} className="cursor-pointer hover:bg-[#FADADD] focus:bg-[#FADADD]">
          <Printer className="w-4 h-4 mr-2 text-[#B24C63]" />
          <div>
            <p className="font-medium text-sm">PDF / Imprimir</p>
            <p className="text-xs text-[#8B6B7A]">Pronto para impressão</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("md")} className="cursor-pointer hover:bg-[#FADADD] focus:bg-[#FADADD]">
          <FileText className="w-4 h-4 mr-2 text-[#B24C63]" />
          <div>
            <p className="font-medium text-sm">Markdown (.md)</p>
            <p className="text-xs text-[#8B6B7A]">Importar em editores</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("html")} className="cursor-pointer hover:bg-[#FADADD] focus:bg-[#FADADD]">
          <FileCode className="w-4 h-4 mr-2 text-[#B24C63]" />
          <div>
            <p className="font-medium text-sm">HTML</p>
            <p className="text-xs text-[#8B6B7A]">Página web standalone</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("txt")} className="cursor-pointer hover:bg-[#FADADD] focus:bg-[#FADADD]">
          <FileType className="w-4 h-4 mr-2 text-[#B24C63]" />
          <div>
            <p className="font-medium text-sm">Texto (.txt)</p>
            <p className="text-xs text-[#8B6B7A]">Puro e simples</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#E6C2C7]" />
        <DropdownMenuItem onClick={() => void downloadFullBackup()}
          className="cursor-pointer hover:bg-[#FADADD] focus:bg-[#FADADD]">
          <ShieldCheck className="mr-2 h-4 w-4 text-[#B24C63]" />
          <div>
            <p className="text-sm font-medium">Backup completo (.json)</p>
            <p className="text-xs text-[#8B6B7A]">História, Escrita Livre e versões</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("json")} className="cursor-pointer hover:bg-[#FADADD] focus:bg-[#FADADD]">
          <Braces className="w-4 h-4 mr-2 text-[#B24C63]" />
          <div>
            <p className="font-medium text-sm">Backup JSON</p>
            <p className="text-xs text-[#8B6B7A]">Backup completo da história</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
