"use client";

import { useMemo } from "react";

interface Props {
  content: string;
}

/**
 * Renderiza texto com formatação markdown básica:
 * - **negrito**
 * - *itálico*
 * - Listas numeradas (1. 2. 3.)
 * - Listas com bullet (- ou •)
 * - Quebras de linha
 * - Cabeçalhos simples (# ##)
 *
 * Não usa biblioteca externa para manter bundle pequeno.
 */
export function FormattedMessage({ content }: Props) {
  const html = useMemo(() => formatMarkdown(content), [content]);

  return (
    <div
      className="formatted-message"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMarkdown(text: string): string {
  if (!text) return "";

  // Escapa HTML primeiro
  let html = escapeHtml(text);

  // Cabeçalhos (## ###)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold flora-text-primary mt-2 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold flora-text-primary mt-3 mb-1">$1</h2>');

  // Separadores (---)
  html = html.replace(/^---$/gm, '<hr class="border-[#E6C2C7] my-3" />');

  // Negrito e itálico
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold flora-text-primary">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-[#FADADD] text-[#B24C63] text-xs font-mono">$1</code>');

  // Divide em linhas para processar listas
  const lines = html.split("\n");
  const result: string[] = [];
  let inOl = false;
  let inUl = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Lista numerada (1. 2. etc)
    const olMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
    if (olMatch) {
      if (!inOl) {
        result.push('<ol class="list-decimal list-inside space-y-1 my-2">');
        inOl = true;
      }
      result.push(`<li class="text-sm">${olMatch[2]}</li>`);
      continue;
    }

    // Lista com bullet (- ou •)
    const ulMatch = line.match(/^\s*[-•]\s+(.+)/);
    if (ulMatch) {
      if (!inUl) {
        result.push('<ul class="list-disc list-inside space-y-1 my-2">');
        inUl = true;
      }
      result.push(`<li class="text-sm">${ulMatch[1]}</li>`);
      continue;
    }

    // Fecha listas se não estamos mais em uma
    if (inOl) {
      result.push("</ol>");
      inOl = false;
    }
    if (inUl) {
      result.push("</ul>");
      inUl = false;
    }

    // Linha vazia
    if (!line.trim()) {
      result.push("");
      continue;
    }

    // Parágrafo normal
    result.push(`<p class="text-sm leading-relaxed">${line}</p>`);
  }

  // Fecha listas abertas no final
  if (inOl) result.push("</ol>");
  if (inUl) result.push("</ul>");

  // Junta parágrafos consecutivos
  let final = result.join("\n");
  final = final.replace(/<\/p>\n<p class="text-sm leading-relaxed">/g, "<br/>");

  return final;
}
