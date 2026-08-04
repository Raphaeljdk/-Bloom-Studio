// ========================================================
// ACTION PARSER — Detecta ações da Flora no chat
// e as executa para modificar a história diretamente.
// ========================================================

import { db } from "@/lib/db";

export interface ParsedAction {
  type: "add_character" | "add_chapter" | "add_timeline" | "add_annotation" | "update_title" | "update_description" | "add_event";
  data: Record<string, unknown>;
  /** Mensagem de confirmação para mostrar no chat */
  confirmation: string;
}

/**
 * Padrões de ação que a Flora pode emitir.
 * A Flora deve usar esses marcadores em suas respostas.
 *
 * Formato: [ACAO:tipo] dados [/ACAO]
 * Ex: [ACAO:personagem] Helena Vidal | Protagonista | Botânica de 34 anos | observadora, reservada [/ACAO]
 */
const ACTION_PATTERNS: Array<{
  type: ParsedAction["type"];
  regex: RegExp;
  parser: (match: string) => ParsedAction | null;
}> = [
  {
    type: "add_character",
    regex: /\[ACAO:personagem\]([\s\S]*?)\[\/ACAO\]/i,
    parser: (raw) => {
      const parts = raw.split("|").map((p) => p.trim());
      if (parts.length < 1) return null;
      return {
        type: "add_character",
        data: {
          name: parts[0],
          role: parts[1] || null,
          description: parts[2] || null,
          traits: parts[3] || null,
        },
        confirmation: `✓ Personagem adicionado: ${parts[0]}`,
      };
    },
  },
  {
    type: "add_chapter",
    regex: /\[ACAO:capitulo\]([\s\S]*?)\[\/ACAO\]/i,
    parser: (raw) => {
      const parts = raw.split("|").map((p) => p.trim());
      if (parts.length < 1) return null;
      return {
        type: "add_chapter",
        data: {
          title: parts[0] || null,
          summary: parts[1] || null,
        },
        confirmation: `✓ Capítulo criado: ${parts[0] || "(sem título)"}`,
      };
    },
  },
  {
    type: "add_timeline",
    regex: /\[ACAO:cronologia\]([\s\S]*?)\[\/ACAO\]/i,
    parser: (raw) => {
      const parts = raw.split("|").map((p) => p.trim());
      if (parts.length < 1) return null;
      return {
        type: "add_timeline",
        data: {
          title: parts[0],
          date: parts[1] || null,
          description: parts[2] || null,
        },
        confirmation: `✓ Evento cronológico adicionado: ${parts[0]}`,
      };
    },
  },
  {
    type: "add_annotation",
    regex: /\[ACAO:anotacao\]([\s\S]*?)\[\/ACAO\]/i,
    parser: (raw) => {
      const parts = raw.split("|").map((p) => p.trim());
      if (parts.length < 1) return null;
      return {
        type: "add_annotation",
        data: {
          category: (parts[0] || "IDEA").toUpperCase(),
          content: parts[1] || parts[0],
        },
        confirmation: `✓ Anotação adicionada: ${parts[1] || parts[0]}`,
      };
    },
  },
  {
    type: "update_title",
    regex: /\[ACAO:titulo\]([\s\S]*?)\[\/ACAO\]/i,
    parser: (raw) => {
      const title = raw.trim().replace(/^["']|["']$/g, "");
      if (!title) return null;
      return {
        type: "update_title",
        data: { title },
        confirmation: `✓ Título atualizado para: ${title}`,
      };
    },
  },
  {
    type: "update_description",
    regex: /\[ACAO:descricao\]([\s\S]*?)\[\/ACAO\]/i,
    parser: (raw) => {
      const description = raw.trim();
      if (!description) return null;
      return {
        type: "update_description",
        data: { description },
        confirmation: `✓ Descrição atualizada`,
      };
    },
  },
  {
    type: "add_event",
    regex: /\[ACAO:evento\]([\s\S]*?)\[\/ACAO\]/i,
    parser: (raw) => {
      const parts = raw.split("|").map((p) => p.trim());
      if (parts.length < 2) return null;
      return {
        type: "add_event",
        data: {
          title: parts[0],
          description: parts[1],
          impact: parts[2] || null,
        },
        confirmation: `✓ Acontecimento importante adicionado: ${parts[0]}`,
      };
    },
  },
];

/**
 * Analisa a resposta da Flora em busca de ações marcadas.
 * Retorna a lista de ações encontradas + o conteúdo limpo (sem os marcadores).
 */
export function parseActions(response: string): {
  actions: ParsedAction[];
  cleanContent: string;
} {
  let cleanContent = response;
  const actions: ParsedAction[] = [];

  for (const pattern of ACTION_PATTERNS) {
    const matches = [...response.matchAll(new RegExp(pattern.regex.source, "gi"))];
    for (const match of matches) {
      const raw = match[1] || "";
      const action = pattern.parser(raw);
      if (action) {
        actions.push(action);
        // Remove o bloco da ação do conteúdo de exibição
        cleanContent = cleanContent.replace(match[0], "").trim();
      }
    }
  }

  // Limpa marcadores órfãos
  cleanContent = cleanContent.replace(/\[ACAO:\w+\][\s\S]*?\[\/ACAO\]/gi, "").trim();

  return { actions, cleanContent };
}

/**
 * Executa uma ação detectada, modificando a história no banco.
 */
export async function executeAction(action: ParsedAction, storyId: string): Promise<void> {
  const { type, data } = action;

  switch (type) {
    case "add_character":
      await db.character.create({
        data: {
          name: String(data.name),
          role: data.role ? String(data.role) : null,
          description: data.description ? String(data.description) : null,
          traits: data.traits ? String(data.traits) : null,
          storyId,
        },
      });
      break;

    case "add_chapter": {
      const last = await db.chapter.findFirst({
        where: { storyId },
        orderBy: { number: "desc" },
      });
      const number = (last?.number || 0) + 1;
      await db.chapter.create({
        data: {
          number,
          title: data.title ? String(data.title) : null,
          summary: data.summary ? String(data.summary) : null,
          storyId,
        },
      });
      break;
    }

    case "add_timeline": {
      const last = await db.timelineEvent.findFirst({
        where: { storyId },
        orderBy: { order: "desc" },
      });
      const order = (last?.order || 0) + 1;
      await db.timelineEvent.create({
        data: {
          title: String(data.title),
          date: data.date ? String(data.date) : null,
          description: data.description ? String(data.description) : null,
          order,
          storyId,
        },
      });
      break;
    }

    case "add_annotation":
      await db.annotation.create({
        data: {
          category: String(data.category),
          content: String(data.content),
          storyId,
        },
      });
      break;

    case "update_title":
      try {
        await db.story.update({
          where: { id: storyId },
          data: { title: String(data.title) },
        });
      } catch {
        await db.$executeRaw`UPDATE Story SET title = ${String(data.title)}, updatedAt = ${new Date()} WHERE id = ${storyId}`;
      }
      break;

    case "update_description":
      try {
        await db.story.update({
          where: { id: storyId },
          data: { description: String(data.description) },
        });
      } catch {
        await db.$executeRaw`UPDATE Story SET description = ${String(data.description)}, updatedAt = ${new Date()} WHERE id = ${storyId}`;
      }
      break;

    case "add_event":
      await db.importantEvent.create({
        data: {
          title: String(data.title),
          description: String(data.description),
          impact: data.impact ? String(data.impact) : null,
          isApproved: true, // Eventos via ação são auto-aprovados
          suggestedBy: "COAUTHOR",
          storyId,
        },
      });
      break;
  }
}

/**
 * Atualiza o prompt da Flora com instruções de como usar ações.
 */
export const ACTION_INSTRUCTIONS = `
🌷 AÇÕES DIRETAS (PODE MODIFICAR A HISTÓRIA):
Quando o autor pedir para você adicionar algo à história, use marcadores de ação. A ação será executada automaticamente e mostrada como confirmação. NÃO peça permissão — execute se o autor pediu claramente.

Formatos (use exatamente):
- [ACAO:personagem] Nome | Função | Descrição | Traços [/ACAO]
- [ACAO:capitulo] Título | Resumo [/ACAO]
- [ACAO:cronologia] Título | Data | Descrição [/ACAO]
- [ACAO:anotacao] CATEGORIA | Conteúdo [/ACAO]  (categorias: IDEA, QUESTION, DECISION, OBSERVATION)
- [ACAO:titulo] Novo título [/ACAO]
- [ACAO:descricao] Nova descrição [/ACAO]
- [ACAO:evento] Título | Descrição | Impacto [/ACAO]

EXCEÇÕES (NÃO execute sem confirmação explícita do autor):
- Eventos importantes que mudam a trama central → use [SUGESTÃO_DE_EVENTO] em vez de [ACAO:evento]
- Mudanças no título se o autor não pediu explicitamente

Use as ações QUANDO o autor pedir claramente: "adicione um personagem chamado X", "crie um capítulo sobre Y", "anote isso", etc.
Sempre explique o que fez em linguagem natural também.
`;
