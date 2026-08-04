// ========================================================
// EXPORT UTILS — Geração de múltiplos formatos no cliente
// ========================================================

interface StoryData {
  title: string;
  description: string | null;
  status: string;
  genre: string | null;
  tone: string | null;
  coverUrl?: string | null;
  characters: Array<{ name: string; description: string | null; role: string | null; traits: string | null }>;
  chapters: Array<{ number: number; title: string | null; summary: string | null; content: string | null; status: string }>;
  timeline: Array<{ title: string; description: string | null; date: string | null; order: number }>;
  events: Array<{ title: string; description: string; impact: string | null; suggestedBy: string }>;
  annotations: Array<{ content: string; category: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em progresso",
  COMPLETED: "Concluída",
  ON_HOLD: "Pausada",
};

const CHAPTER_STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  WRITING: "Escrevendo",
  REVISION: "Revisão",
  COMPLETED: "Concluído",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "historia";
}

// ===== MARKDOWN =====
export function exportMarkdown(story: StoryData): void {
  const lines: string[] = [];
  lines.push(`# ${story.title}\n`);
  if (story.description) lines.push(`> ${story.description}\n`);
  lines.push(`**Status:** ${STATUS_LABELS[story.status] || story.status}  `);
  if (story.genre) lines.push(`**Gênero:** ${story.genre}  `);
  if (story.tone) lines.push(`**Tom:** ${story.tone}  `);
  lines.push(`**Exportado em:** ${new Date().toLocaleString("pt-BR")}\n`);

  lines.push(`## Personagens\n`);
  if (story.characters.length === 0) {
    lines.push(`_Nenhum personagem cadastrado._\n`);
  } else {
    story.characters.forEach((c, i) => {
      lines.push(`### ${i + 1}. ${c.name}${c.role ? ` — _${c.role}_` : ""}\n`);
      if (c.description) lines.push(`${c.description}\n`);
      if (c.traits) lines.push(`**Traços:** ${c.traits}\n`);
    });
  }

  lines.push(`## Cronologia\n`);
  if (story.timeline.length === 0) {
    lines.push(`_Sem eventos cronológicos._\n`);
  } else {
    story.timeline.forEach((t, i) => {
      lines.push(`### ${i + 1}. ${t.title}${t.date ? ` _(${t.date})_` : ""}\n`);
      if (t.description) lines.push(`${t.description}\n`);
    });
  }

  lines.push(`## Capítulos\n`);
  if (story.chapters.length === 0) {
    lines.push(`_Nenhum capítulo escrito ainda._\n`);
  } else {
    story.chapters.forEach((c) => {
      lines.push(`### Capítulo ${c.number}${c.title ? ` — ${c.title}` : ""} [${CHAPTER_STATUS[c.status] || c.status}]\n`);
      if (c.summary) lines.push(`> ${c.summary}\n`);
      if (c.content) lines.push(`${c.content}\n`);
      lines.push(`---\n`);
    });
  }

  lines.push(`## Acontecimentos Importantes\n`);
  if (story.events.length === 0) {
    lines.push(`_Nenhum evento importante aprovado._\n`);
  } else {
    story.events.forEach((e, i) => {
      lines.push(`### ${i + 1}. ${e.title}\n`);
      lines.push(`${e.description}\n`);
      if (e.impact) lines.push(`**Impacto:** ${e.impact}\n`);
    });
  }

  lines.push(`## Anotações\n`);
  if (story.annotations.length === 0) {
    lines.push(`_Sem anotações._\n`);
  } else {
    const byCat: Record<string, string[]> = {};
    story.annotations.forEach((a) => {
      if (!byCat[a.category]) byCat[a.category] = [];
      byCat[a.category].push(a.content);
    });
    Object.entries(byCat).forEach(([cat, items]) => {
      lines.push(`### ${cat}\n`);
      items.forEach((it) => lines.push(`- ${it}`));
      lines.push(`\n`);
    });
  }

  lines.push(`\n---\n_Gerado por Bloom Studio 🌸_\n`);
  download(`${slugify(story.title)}.md`, lines.join("\n"), "text/markdown");
}

// ===== HTML =====
export function exportHTML(story: StoryData): void {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(story.title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #2a1a22; line-height: 1.7; background: #FDF2F0; }
  h1 { text-align: center; color: #4A2C3A; font-size: 2.4rem; margin-bottom: 0.5rem; }
  .desc { text-align: center; font-style: italic; color: #6b4a58; margin-bottom: 2rem; }
  .meta { text-align: center; font-size: 0.85rem; color: #8B6B7A; margin-bottom: 3rem; padding: 1rem; background: #FADADD; border-radius: 8px; }
  h2 { color: #B24C63; border-bottom: 2px solid #E6C2C7; padding-bottom: 0.3rem; margin-top: 2.5rem; }
  h3 { color: #4A2C3A; margin-top: 1.5rem; }
  .char { border-left: 3px solid #D4818B; padding-left: 1rem; margin-bottom: 1rem; }
  .summary { font-style: italic; color: #6b4a58; border-left: 3px solid #E6C2C7; padding-left: 1rem; margin: 0.5rem 0; }
  .content { white-space: pre-wrap; margin-top: 0.5rem; }
  .badge { display: inline-block; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 9999px; background: #FADADD; color: #B24C63; margin-left: 0.3rem; }
  .event { border-left: 3px solid #7EB8A2; padding-left: 1rem; margin-bottom: 1rem; }
  .footer { text-align: center; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #E6C2C7; font-size: 0.8rem; color: #8B6B7A; font-style: italic; }
  ol { padding-left: 1.5rem; }
</style>
</head>
<body>
  <h1>🌸 ${escapeHtml(story.title)}</h1>
  ${story.description ? `<p class="desc">${escapeHtml(story.description)}</p>` : ""}
  <div class="meta">
    <strong>${STATUS_LABELS[story.status] || story.status}</strong>
    ${story.genre ? ` · ${escapeHtml(story.genre)}` : ""}
    ${story.tone ? ` · Tom: ${escapeHtml(story.tone)}` : ""}
    <br>Exportado em ${new Date().toLocaleString("pt-BR")}
  </div>

  <h2>🎭 Personagens</h2>
  ${story.characters.length === 0
    ? "<p><em>Nenhum personagem cadastrado.</em></p>"
    : story.characters.map((c, i) => `
      <div class="char">
        <h3>${i + 1}. ${escapeHtml(c.name)}${c.role ? ` <em>— ${escapeHtml(c.role)}</em>` : ""}</h3>
        ${c.description ? `<p>${escapeHtml(c.description)}</p>` : ""}
        ${c.traits ? `<p style="font-size:0.85rem;color:#8B6B7A"><strong>Traços:</strong> ${escapeHtml(c.traits)}</p>` : ""}
      </div>
    `).join("")
  }

  <h2>📅 Cronologia</h2>
  ${story.timeline.length === 0
    ? "<p><em>Sem eventos cronológicos.</em></p>"
    : `<ol>${story.timeline.map((t) => `
      <li><strong>${escapeHtml(t.title)}</strong>${t.date ? ` <em>(${escapeHtml(t.date)})</em>` : ""}${t.description ? `<br><span style="font-size:0.9rem;color:#6b4a58">${escapeHtml(t.description)}</span>` : ""}</li>
    `).join("")}</ol>`
  }

  <h2>📖 Capítulos</h2>
  ${story.chapters.length === 0
    ? "<p><em>Nenhum capítulo escrito ainda.</em></p>"
    : story.chapters.map((c) => `
      <div style="margin-bottom: 2rem;">
        <h3>Capítulo ${c.number}${c.title ? ` — ${escapeHtml(c.title)}` : ""} <span class="badge">${CHAPTER_STATUS[c.status] || c.status}</span></h3>
        ${c.summary ? `<p class="summary">${escapeHtml(c.summary)}</p>` : ""}
        ${c.content ? `<div class="content">${escapeHtml(c.content)}</div>` : ""}
      </div>
    `).join("")
  }

  <h2>✨ Acontecimentos Importantes</h2>
  ${story.events.length === 0
    ? "<p><em>Nenhum acontecimento importante aprovado.</em></p>"
    : story.events.map((e, i) => `
      <div class="event">
        <h3>${i + 1}. ${escapeHtml(e.title)} <span class="badge">${e.suggestedBy === "COAUTHOR" ? "🌸 Flora" : "✍️ Autor"}</span></h3>
        <p>${escapeHtml(e.description)}</p>
        ${e.impact ? `<p style="font-size:0.85rem;color:#8B6B7A;font-style:italic"><strong>Impacto:</strong> ${escapeHtml(e.impact)}</p>` : ""}
      </div>
    `).join("")
  }

  <h2>📝 Anotações</h2>
  ${story.annotations.length === 0
    ? "<p><em>Sem anotações.</em></p>"
    : `<div>${Object.entries(
        story.annotations.reduce<Record<string, typeof story.annotations>>((acc, a) => {
          if (!acc[a.category]) acc[a.category] = [];
          acc[a.category].push(a);
          return acc;
        }, {})
      ).map(([cat, items]) => `
        <h4 style="color:#8B6B7A;text-transform:uppercase;font-size:0.9rem;letter-spacing:0.05em">${cat}</h4>
        <ul>${items.map((a) => `<li>${escapeHtml(a.content)}</li>`).join("")}</ul>
      `).join("")}</div>`
  }

  <p class="footer">🌸 Documento gerado pelo Bloom Studio · ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
</body>
</html>`;

  download(`${slugify(story.title)}.html`, html, "text/html");
}

// ===== PDF (via impressão) com capa integrada =====
export function exportPDF(story: StoryData): void {
  const coverHtml = story.coverUrl
    ? `<div class="cover-page"><img src="${escapeHtml(story.coverUrl)}" alt="Capa" class="cover-image" /><div class="cover-overlay"><h1 class="cover-title">🌸 ${escapeHtml(story.title)}</h1>${story.description ? `<p class="cover-desc">${escapeHtml(story.description)}</p>` : ""}${story.genre ? `<p class="cover-genre">${escapeHtml(story.genre)}</p>` : ""}</div></div>`
    : `<h1>🌸 ${escapeHtml(story.title)}</h1>${story.description ? `<p class="desc">${escapeHtml(story.description)}</p>` : ""}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(story.title)}</title>
${story.coverUrl ? `<meta name="cover-image" content="${escapeHtml(story.coverUrl)}" />` : ""}
<style>
  @page { margin: 2.5cm; }
  @page :first { margin: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2a1a22; line-height: 1.7; max-width: 700px; margin: 0 auto; padding: 2rem; }
  .cover-page { position: relative; width: 100%; height: 100vh; min-height: 600px; page-break-after: always; margin: -2rem -2rem 2rem; overflow: hidden; }
  .cover-image { width: 100%; height: 100%; object-fit: cover; }
  .cover-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 3rem 2rem 2rem; background: linear-gradient(to top, rgba(74, 44, 58, 0.95) 0%, rgba(74, 44, 58, 0.7) 60%, transparent 100%); color: white; }
  .cover-title { font-size: 2.5rem; color: white !important; margin-bottom: 0.5rem; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
  .cover-desc { font-style: italic; color: rgba(255,255,255,0.9) !important; margin-bottom: 0.5rem; font-size: 1rem; }
  .cover-genre { font-size: 0.85rem; color: rgba(255,255,255,0.7) !important; text-transform: uppercase; letter-spacing: 0.1em; }
  h1 { text-align: center; font-size: 2rem; color: #4A2C3A; }
  .desc { text-align: center; font-style: italic; color: #6b4a58; }
  .meta { text-align: center; font-size: 0.85rem; color: #8B6B7A; margin-bottom: 2rem; }
  h2 { font-size: 1.4rem; color: #4A2C3A; border-bottom: 1px solid #E6C2C7; padding-bottom: 0.3rem; margin-top: 2rem; }
  h3 { font-size: 1.1rem; color: #4A2C3A; }
  .char { border-left: 3px solid #D4818B; padding-left: 1rem; margin-bottom: 1rem; }
  .summary { font-style: italic; color: #6b4a58; border-left: 3px solid #E6C2C7; padding-left: 1rem; margin: 0.5rem 0 1rem; }
  .content { white-space: pre-wrap; margin-top: 0.5rem; }
  .badge { display: inline-block; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 9999px; background: #FADADD; color: #B24C63; margin-left: 0.3rem; }
  .event { border-left: 3px solid #7EB8A2; padding-left: 1rem; margin-bottom: 1rem; }
  .footer { text-align: center; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #E6C2C7; font-size: 0.8rem; color: #8B6B7A; font-style: italic; }
  ol { padding-left: 1.5rem; }
  @media print { body { padding: 0; max-width: none; } .cover-page { margin: 0; } }
</style>
</head>
<body>
  ${coverHtml}
  ${story.coverUrl ? `<div style="page-break-before: always;"></div><p class="meta">${STATUS_LABELS[story.status] || story.status}${story.genre ? ` · ${escapeHtml(story.genre)}` : ""}${story.tone ? ` · Tom: ${escapeHtml(story.tone)}` : ""}</p>` : `<p class="meta">${STATUS_LABELS[story.status] || story.status}${story.genre ? ` · ${escapeHtml(story.genre)}` : ""}${story.tone ? ` · Tom: ${escapeHtml(story.tone)}` : ""}</p>`}

  <h2>🎭 Personagens</h2>
  ${story.characters.length === 0 ? "<p><em>Nenhum personagem.</em></p>" : story.characters.map((c, i) => `
    <div class="char"><h3>${i + 1}. ${escapeHtml(c.name)}${c.role ? ` <em>— ${escapeHtml(c.role)}</em>` : ""}</h3>${c.description ? `<p>${escapeHtml(c.description)}</p>` : ""}${c.traits ? `<p style="font-size:0.85rem;color:#8B6B7A"><strong>Traços:</strong> ${escapeHtml(c.traits)}</p>` : ""}</div>
  `).join("")}

  <h2>📅 Cronologia</h2>
  ${story.timeline.length === 0 ? "<p><em>Sem eventos.</em></p>" : `<ol>${story.timeline.map((t) => `<li><strong>${escapeHtml(t.title)}</strong>${t.date ? ` <em>(${escapeHtml(t.date)})</em>` : ""}${t.description ? `<br><span style="font-size:0.9rem;color:#6b4a58">${escapeHtml(t.description)}</span>` : ""}</li>`).join("")}</ol>`}

  <h2>📖 Capítulos</h2>
  ${story.chapters.length === 0 ? "<p><em>Nenhum capítulo.</em></p>" : story.chapters.map((c) => `
    <div style="margin-bottom: 2rem;"><h3>Capítulo ${c.number}${c.title ? ` — ${escapeHtml(c.title)}` : ""} <span class="badge">${CHAPTER_STATUS[c.status] || c.status}</span></h3>${c.summary ? `<p class="summary">${escapeHtml(c.summary)}</p>` : ""}${c.content ? `<div class="content">${escapeHtml(c.content)}</div>` : ""}</div>
  `).join("")}

  <h2>✨ Acontecimentos Importantes</h2>
  ${story.events.length === 0 ? "<p><em>Nenhum evento.</em></p>" : story.events.map((e, i) => `
    <div class="event"><h3>${i + 1}. ${escapeHtml(e.title)} <span class="badge">${e.suggestedBy === "COAUTHOR" ? "🌸 Flora" : "✍️ Autor"}</span></h3><p>${escapeHtml(e.description)}</p>${e.impact ? `<p style="font-size:0.85rem;color:#8B6B7A;font-style:italic"><strong>Impacto:</strong> ${escapeHtml(e.impact)}</p>` : ""}</div>
  `).join("")}

  <h2>📝 Anotações</h2>
  ${story.annotations.length === 0 ? "<p><em>Sem anotações.</em></p>" : `<div>${Object.entries(story.annotations.reduce<Record<string, typeof story.annotations>>((acc, a) => { if (!acc[a.category]) acc[a.category] = []; acc[a.category].push(a); return acc; }, {})).map(([cat, items]) => `<h4 style="color:#8B6B7A;text-transform:uppercase;font-size:0.9rem">${cat}</h4><ul>${items.map((a) => `<li>${escapeHtml(a.content)}</li>`).join("")}</ul>`).join("")}</div>`}

  <p class="footer">🌸 Bloom Studio · ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 600);
}

// ===== TXT =====
export function exportTXT(story: StoryData): void {
  const lines: string[] = [];
  lines.push(story.title.toUpperCase());
  lines.push("=".repeat(story.title.length));
  if (story.description) lines.push(`\n${story.description}`);
  lines.push(`\nStatus: ${STATUS_LABELS[story.status] || story.status}`);
  if (story.genre) lines.push(`Gênero: ${story.genre}`);
  if (story.tone) lines.push(`Tom: ${story.tone}`);
  lines.push(`\nExportado em: ${new Date().toLocaleString("pt-BR")}\n`);

  lines.push("\nPERSONAGENS\n----------");
  if (story.characters.length === 0) lines.push("(Nenhum)");
  story.characters.forEach((c, i) => {
    lines.push(`\n${i + 1}. ${c.name}${c.role ? ` — ${c.role}` : ""}`);
    if (c.description) lines.push(`   ${c.description}`);
    if (c.traits) lines.push(`   Traços: ${c.traits}`);
  });

  lines.push("\n\nCRONOLOGIA\n---------");
  if (story.timeline.length === 0) lines.push("(Nenhuma)");
  story.timeline.forEach((t, i) => {
    lines.push(`\n${i + 1}. ${t.title}${t.date ? ` (${t.date})` : ""}`);
    if (t.description) lines.push(`   ${t.description}`);
  });

  lines.push("\n\nCAPÍTULOS\n--------");
  if (story.chapters.length === 0) lines.push("(Nenhum)");
  story.chapters.forEach((c) => {
    lines.push(`\nCapítulo ${c.number}${c.title ? ` — ${c.title}` : ""} [${CHAPTER_STATUS[c.status] || c.status}]`);
    if (c.summary) lines.push(`Resumo: ${c.summary}`);
    if (c.content) lines.push(`\n${c.content}`);
    lines.push("");
  });

  lines.push("\nACONTECIMENTOS IMPORTANTES\n-------------------------");
  if (story.events.length === 0) lines.push("(Nenhum)");
  story.events.forEach((e, i) => {
    lines.push(`\n${i + 1}. ${e.title}`);
    lines.push(`   ${e.description}`);
    if (e.impact) lines.push(`   Impacto: ${e.impact}`);
  });

  lines.push("\n\nANOTAÇÕES\n--------");
  if (story.annotations.length === 0) lines.push("(Nenhuma)");
  const byCat: Record<string, string[]> = {};
  story.annotations.forEach((a) => {
    if (!byCat[a.category]) byCat[a.category] = [];
    byCat[a.category].push(a.content);
  });
  Object.entries(byCat).forEach(([cat, items]) => {
    lines.push(`\n[${cat}]`);
    items.forEach((it) => lines.push(`  - ${it}`));
  });

  lines.push(`\n\n--- Gerado por Bloom Studio ---`);
  download(`${slugify(story.title)}.txt`, lines.join("\n"), "text/plain");
}

// ===== JSON (backup completo) =====
export function exportJSON(story: StoryData): void {
  const backup = {
    _meta: {
      app: "Bloom Studio",
      version: 1,
      exportedAt: new Date().toISOString(),
    },
    ...story,
  };
  download(`${slugify(story.title)}.json`, JSON.stringify(backup, null, 2), "application/json");
}
