// ========================================================
// SUGGESTION GUARD — Bloom Studio
// Analisa a resposta da Flora em busca de [SUGESTÃO_DE_EVENTO]
// Extrai, persiste como pendente e formata a resposta.
// ========================================================

import { db } from "@/lib/db";
import { SUGGESTION_MARKER } from "./prompt-templates";

export interface SuggestionExtracted {
  /** Título curto do evento sugerido */
  title: string;
  /** Descrição detalhada */
  description: string;
  /** Impacto narrativo, se mencionado */
  impact?: string;
}

export interface GuardResult {
  /** Texto limpo para exibir ao usuário (sem o bloco de sugestão bruto) */
  displayContent: string;
  /** Sugestões extraídas (uma ou mais) — já persistidas como pendentes */
  suggestions: SuggestionExtracted[];
}

/**
 * Expressão regular para detectar blocos [SUGESTÃO_DE_EVENTO] ... [/SUGESTÃO_DE_EVENTO]
 * ou [SUGESTÃO_DE_EVENTO] até o final / próxima linha em branco.
 *
 * A Flora pode usar três formatos:
 *   1. [SUGESTÃO_DE_EVENTO] título | descrição | impacto [/SUGESTÃO_DE_EVENTO]
 *   2. [SUGESTÃO_DE_EVENTO]\nTítulo: ...\nDescrição: ...\nImpacto: ...[/SUGESTÃO_DE_EVENTO]
 *   3. [SUGESTÃO_DE_EVENTO] texto livre descrevendo o evento
 */
const SUGGESTION_BLOCK_REGEX =
  /\[SUGESTÃO_DE_EVENTO\]([\s\S]*?)(?:\[\/SUGESTÃO_DE_EVENTO\]|(?=\n\n|\n(?=[A-ZÁ-Ú#•\-])|$))/g;

/**
 * Faz o parse de um bloco bruto de sugestão em estrutura tipada.
 */
function parseSuggestionBlock(raw: string): SuggestionExtracted {
  const trimmed = raw.trim();

  // Tenta formato pipe: "título | descrição | impacto"
  if (trimmed.includes("|")) {
    const parts = trimmed.split("|").map((p) => p.trim());
    return {
      title: parts[0] || "Evento sugerido",
      description: parts[1] || parts[0] || "",
      impact: parts[2] || undefined,
    };
  }

  // Tenta formato estruturado com labels
  const titleMatch = trimmed.match(/(?:^|\n)T[ií]tulo:\s*(.+)/i);
  const descMatch = trimmed.match(/(?:^|\n)Descri[cç][aã]o:\s*([\s\S]+?)(?=\n(?:Impacto|Justificativa|Por qu[eê])|$)/i);
  const impactMatch = trimmed.match(/(?:^|\n)Impacto:\s*(.+)/i);

  if (titleMatch || descMatch) {
    return {
      title: titleMatch?.[1]?.trim() || "Evento sugerido",
      description: descMatch?.[1]?.trim() || trimmed,
      impact: impactMatch?.[1]?.trim() || undefined,
    };
  }

  // Formato livre: primeira linha = título, resto = descrição
  const lines = trimmed.split("\n").filter(Boolean);
  if (lines.length === 0) {
    return { title: "Evento sugerido", description: trimmed };
  }
  if (lines.length === 1) {
    return { title: lines[0].slice(0, 80), description: lines[0] };
  }
  return {
    title: lines[0].slice(0, 80),
    description: lines.slice(1).join("\n").trim(),
  };
}

/**
 * Analisa a resposta da IA, extrai sugestões, persiste como pendentes
 * e retorna o conteúdo formatado para o usuário + lista de sugestões.
 *
 * @param rawResponse Texto bruto retornado pela Flora
 * @param storyId ID da história para persistir sugestões pendentes
 */
export async function processResponse(
  rawResponse: string,
  storyId: string
): Promise<GuardResult> {
  const suggestions: SuggestionExtracted[] = [];
  let displayContent = rawResponse;

  // Coleta todos os blocos de sugestão
  const matches = [...rawResponse.matchAll(SUGGESTION_BLOCK_REGEX)];

  if (matches.length === 0) {
    // Verifica se o marcador aparece inline sem fecho
    if (rawResponse.includes(SUGGESTION_MARKER)) {
      const idx = rawResponse.indexOf(SUGGESTION_MARKER);
      const after = rawResponse.slice(idx + SUGGESTION_MARKER.length).trim();
      const blockEnd = after.indexOf("\n\n");
      const blockText = blockEnd === -1 ? after : after.slice(0, blockEnd);
      const suggestion = parseSuggestionBlock(blockText);
      suggestions.push(suggestion);

      // Remove o bloco do display e substitui por marcador especial
      const before = rawResponse.slice(0, idx).trim();
      const rest = blockEnd === -1 ? "" : after.slice(blockEnd + 2).trim();
      displayContent = [before, rest].filter(Boolean).join("\n\n");
    }
  } else {
    for (const match of matches) {
      const blockRaw = match[1] || "";
      const suggestion = parseSuggestionBlock(blockRaw);
      suggestions.push(suggestion);
    }
    // Remove todos os blocos do display — o frontend vai renderizar cards dedicados
    displayContent = rawResponse.replace(SUGGESTION_BLOCK_REGEX, "").trim();
    // Limpa marcadores órfãos
    displayContent = displayContent.replace(SUGGESTION_MARKER, "").trim();
  }

  // Persiste cada sugestão como ImportantEvent pendente (suggestedBy: COAUTHOR)
  const persisted: { id: string; title: string; description: string; impact: string | null }[] = [];
  for (const sug of suggestions) {
    const event = await db.importantEvent.create({
      data: {
        title: sug.title,
        description: sug.description,
        impact: sug.impact || null,
        isApproved: false,
        suggestedBy: "COAUTHOR",
        storyId,
      },
    });
    persisted.push({
      id: event.id,
      title: event.title,
      description: event.description,
      impact: event.impact,
    });
  }

  return {
    displayContent,
    suggestions: persisted,
  };
}
