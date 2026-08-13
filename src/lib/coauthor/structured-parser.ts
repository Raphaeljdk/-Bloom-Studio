// ========================================================
// STRUCTURED CONTENT PARSER v2
// Extrai capítulos, personagens, cronologia, acontecimentos
// de uma resposta estruturada da Flora.
// ========================================================

export interface ParsedChapter {
  number?: number;
  title: string;
  summary?: string;
  content?: string;
}

export interface ParsedCharacter {
  name: string;
  role?: string;
  description?: string;
  traits?: string;
}

export interface ParsedTimelineEvent {
  title: string;
  date?: string;
  description?: string;
}

export interface ParsedEvent {
  title: string;
  description: string;
  impact?: string;
}

export interface ParsedAnnotation {
  category: string;
  content: string;
}

export interface ParsedStructuredContent {
  hasStructure: boolean;
  chapters: ParsedChapter[];
  characters: ParsedCharacter[];
  timeline: ParsedTimelineEvent[];
  events: ParsedEvent[];
  annotations: ParsedAnnotation[];
  rawContent: string;
}

function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const pattern1 = /═{3,}\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s]+)\s*═{3,}/g;
  const pattern2 = /^##\s+(.+)$/gm;
  const pattern3 = /\*\*([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^*]{2,50}):\s*\*\*/g;

  const markers: Array<{ name: string; markerStart: number; contentStart: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = pattern1.exec(text)) !== null) {
    markers.push({ name: match[1].trim().toLowerCase(), markerStart: match.index, contentStart: match.index + match[0].length });
  }
  if (markers.length === 0) {
    while ((match = pattern2.exec(text)) !== null) {
      markers.push({ name: match[1].trim().toLowerCase(), markerStart: match.index, contentStart: match.index + match[0].length });
    }
  }
  if (markers.length === 0) {
    while ((match = pattern3.exec(text)) !== null) {
      markers.push({ name: match[1].trim().toLowerCase(), markerStart: match.index, contentStart: match.index + match[0].length });
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const contentStart = markers[i].contentStart;
    const contentEnd = i + 1 < markers.length ? markers[i + 1].markerStart : text.length;
    const content = text.slice(contentStart, contentEnd).trim();
    if (content) sections[markers[i].name] = content;
  }

  if (Object.keys(sections).length === 0) {
    const hasChapterKeyword = /cap[ií]tulo\s*\d+/i.test(text);
    if (hasChapterKeyword) {
      sections["capítulos"] = text;
    } else {
      const hasCharacterPattern = /\d+\.\s*\*?\*?[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^*\n]{2,40}\*?\*?\s*\n[A-Z]/.test(text);
      if (hasCharacterPattern) sections["personagens"] = text;
    }
  }

  return sections;
}

function parseChapters(content: string): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];
  const chapterRegex = /(?:\*\*)?(?:cap[ií]tulo\s*)?(\d+)(?:\*\*)?[\s:.\-)]+\s*(.+?)(?=(?:\*\*)?(?:cap[ií]tulo\s*)?\d+(?:\*\*)?[\s:.\-)]+|$)/gis;
  const matches = [...content.matchAll(chapterRegex)];

  for (const match of matches) {
    const number = parseInt(match[1], 10);
    const rawTitleAndContent = match[2].trim();
    const lines = rawTitleAndContent.split("\n");
    const title = lines[0].trim().replace(/^["']|["']$/g, "").replace(/\*\*/g, "");
    let summary = "";
    let chapterContent = "";
    let inContent = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^RESUMO:\s*/i)) {
        summary = line.replace(/^RESUMO:\s*/i, "").trim();
      } else if (line.match(/^CONTE[UÚ]DO:\s*/i)) {
        inContent = true;
        const firstLine = line.replace(/^CONTE[UÚ]DO:\s*/i, "").trim();
        if (firstLine) chapterContent = firstLine;
      } else if (inContent) {
        chapterContent = chapterContent ? chapterContent + "\n" + line : line;
      } else if (summary && !chapterContent) {
        chapterContent = line;
        inContent = true;
      }
    }
    if (!summary && !chapterContent && lines.length > 1) {
      chapterContent = lines.slice(1).join("\n").trim();
    }
    chapters.push({ number, title: title || `Capítulo ${number}`, summary: summary || undefined, content: chapterContent || undefined });
  }
  return chapters;
}

function parseCharacters(content: string): ParsedCharacter[] {
  const characters: ParsedCharacter[] = [];
  const lines = content.split("\n");
  let currentChar: ParsedCharacter | null = null;

  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim();
    if (!trimmed) { if (currentChar) { characters.push(currentChar); currentChar = null; } continue; }
    const numMatch = trimmed.match(/^\d+[.)\s]+(.+)/);
    if (numMatch) { if (currentChar) characters.push(currentChar); trimmed = numMatch[1].trim(); }
    else if (trimmed.match(/^[-•*]\s+/)) { if (currentChar) characters.push(currentChar); trimmed = trimmed.replace(/^[-•*]\s+/, ""); }
    trimmed = trimmed.replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/\*\*/g, "").trim();
    if (!trimmed) continue;

    const isNameLine = trimmed.length <= 60 && !trimmed.endsWith(".");
    if (isNameLine && (!currentChar || currentChar.description)) {
      if (currentChar) characters.push(currentChar);
      let name = trimmed; let role = ""; let description = "";
      let match = trimmed.match(/^(.+?)\s*[—–-]\s*(.+)$/);
      if (match) {
        name = match[1].trim().replace(/^["']|["']$/g, "");
        const rest = match[2].trim();
        const funcMatch = rest.match(/^(.+?):\s*(.+)$/);
        if (funcMatch) { role = funcMatch[1].trim(); description = funcMatch[2].trim(); } else { description = rest; }
      } else {
        match = trimmed.match(/^(.+?):\s*(.+)$/);
        if (match) { name = match[1].trim(); description = match[2].trim(); }
      }
      const roleInParens = name.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (roleInParens) { name = roleInParens[1].trim(); if (!role) role = roleInParens[2].trim(); }
      currentChar = { name, role: role || undefined, description: description || undefined };
    } else if (currentChar) {
      currentChar.description = currentChar.description ? currentChar.description + " " + trimmed : trimmed;
    } else {
      let name = trimmed; let description = "";
      const match = trimmed.match(/^(.+?):\s*(.+)$/);
      if (match) { name = match[1].trim(); description = match[2].trim(); }
      if (name.length > 0 && name.length <= 60) currentChar = { name, description: description || undefined };
    }
  }
  if (currentChar) characters.push(currentChar);
  return characters.filter(c => c.name && c.name.length > 0 && c.name.length <= 60);
}

function parseTimeline(content: string): ParsedTimelineEvent[] {
  const events: ParsedTimelineEvent[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;
    trimmed = trimmed.replace(/^\d+[.)\s]+/, "").replace(/^[-•*]\s+/, "");

    // Padrão: **Data**: evento (markdown negrito)
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*:?\s*(.+)$/);
    if (boldMatch) {
      const date = boldMatch[1].trim();
      const description = boldMatch[2].trim();
      events.push({ title: description.slice(0, 80), date, description });
      continue;
    }

    // Padrão: Data: evento
    const match = trimmed.match(/^(.+?):\s*(.+)$/);
    if (match) {
      events.push({ title: match[2].trim().slice(0, 80), date: match[1].trim(), description: match[2].trim() });
    } else if (trimmed.length > 5) {
      events.push({ title: trimmed.slice(0, 80), description: trimmed });
    }
  }
  return events;
}

function parseEvents(content: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = content.split("\n");
  let currentEvent: ParsedEvent | null = null;

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-•*]\s*/, "").replace(/^\d+[.)\s]+/, "").replace(/\*\*/g, "");
    if (!trimmed) continue;
    const match = trimmed.match(/^(.+?):\s*(.+)$/);
    if (match) {
      if (currentEvent) events.push(currentEvent);
      currentEvent = { title: match[1].trim().replace(/^["']|["']$/g, ""), description: match[2].trim() };
    } else if (currentEvent) {
      currentEvent.description = currentEvent.description ? currentEvent.description + " " + trimmed : trimmed;
    }
  }
  if (currentEvent) events.push(currentEvent);
  return events;
}

function cleanResponse(text: string): string {
  let cleaned = text;
  const unwantedPatterns = [
    /Agora[^.]*?(?:gostaria|quer|escolha)[^]*?(?:opção|continuar|criar)[^.]*\?/gi,
    /Escolha uma opção para continuar!?\s*/gi,
    /Agora,?\s*vamos adicionar[^]*$/gi,
    /\[ACAO:[^\]]*\]/gi,
  ];
  for (const pattern of unwantedPatterns) cleaned = cleaned.replace(pattern, "").trim();
  return cleaned;
}

export function parseStructuredContent(text: string): ParsedStructuredContent {
  const cleanedText = cleanResponse(text);
  const sections = extractSections(cleanedText);

  const result: ParsedStructuredContent = {
    hasStructure: Object.keys(sections).length > 0,
    chapters: [], characters: [], timeline: [], events: [], annotations: [], rawContent: text,
  };

  for (const [sectionName, sectionContent] of Object.entries(sections)) {
    const lower = sectionName.toLowerCase();
    if (lower.includes("capítulo") || lower.includes("capitulo") || lower.includes("chapter")) {
      result.chapters = parseChapters(sectionContent);
    } else if (lower.includes("personage") || lower.includes("character")) {
      result.characters = parseCharacters(sectionContent);
    } else if (lower.includes("cronolog") || lower.includes("timeline") || lower.includes("linha do tempo")) {
      result.timeline = parseTimeline(sectionContent);
    } else if (lower.includes("acontecimento") || lower.includes("evento") || lower.includes("event")) {
      if (result.timeline.length > 0 || lower.includes("importante")) result.events = parseEvents(sectionContent);
      else result.timeline = parseTimeline(sectionContent);
    } else if (lower.includes("anota") || lower.includes("annotation") || lower.includes("note")) {
      const lines = sectionContent.split("\n").filter((l) => l.trim());
      result.annotations = lines.map((line) => {
        const trimmed = line.trim().replace(/^[-•*]\s*/, "");
        const match = trimmed.match(/^\[?(\w+)\]?\s*[:\-]\s*(.+)$/);
        if (match) return { category: match[1].toUpperCase(), content: match[2].trim() };
        return { category: "IDEA", content: trimmed };
      });
    }
  }

  if (!result.hasStructure || result.chapters.length === 0) {
    const freeChapters = parseChapters(cleanedText);
    if (freeChapters.length > 0) { result.chapters = freeChapters; result.hasStructure = true; }
  }

  result.hasStructure = result.chapters.length > 0 || result.characters.length > 0 || result.timeline.length > 0 || result.events.length > 0 || result.annotations.length > 0;
  return result;
}
