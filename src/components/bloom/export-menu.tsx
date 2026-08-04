"use client";

import { useState } from "react";
import { Download, FileText, FileCode, FileType, Braces, Printer, Loader2 } from "lucide-react";
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
