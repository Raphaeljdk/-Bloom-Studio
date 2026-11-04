/* Testes de integração executados APENAS em banco PostgreSQL efêmero local.
 * Exemplo: DATABASE_URL=postgresql://...@127.0.0.1:5432/bloom_qa_db node tests/qa-flora.cjs
 * Requer aplicação Next.js local em BLOOM_QA_BASE_URL.
 */
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("node:crypto");

const dbUrl = new URL(process.env.DATABASE_URL || "postgresql://invalid:invalid@invalid/test");
if (!["127.0.0.1", "localhost"].includes(dbUrl.hostname) || dbUrl.pathname !== "/bloom_qa_db") {
  console.error("RECUSADO: este teste só pode operar no PostgreSQL efêmero bloom_qa_db local.");
  process.exit(2);
}

const db = new PrismaClient({ log: ["error"] });
const base = process.env.BLOOM_QA_BASE_URL || "http://127.0.0.1:3101";
const prefix = randomUUID();
const passed = [];
let cookie = "";

async function request(path, method = "GET", payload) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(payload === undefined ? {} : { "Content-Type": "application/json" }) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  let body = {};
  try { body = await res.json(); } catch {}
  return { status: res.status, body, cookie: res.headers.get("set-cookie") };
}
function expect(response, status, label) {
  assert.equal(response.status, status, label + ": " + JSON.stringify(response.body).slice(0, 120));
  passed.push(label);
}

async function main() {
  let r = await request("/api/auth/login", "POST", {
    name: "QA Author A", email: "qa-a-" + prefix + "@example.test", password: "isolatedLongPassword2026",
  });
  expect(r, 200, "cadastro A"); const alice = r.cookie.split(";")[0]; cookie = alice;

  r = await request("/api/stories", "POST", { title: "QA Universe" });
  expect(r, 200, "história"); const storyId = r.body.id;
  r = await request("/api/stories/" + storyId + "/free-write");
  expect(r, 200, "rascunho inicial");
  r = await request("/api/stories/" + storyId + "/free-write", "PUT", { content: "versão alfa", expectedVersion: 0 });
  expect(r, 200, "salvamento 1");
  r = await request("/api/stories/" + storyId + "/free-write", "PUT", { content: "versão beta", expectedVersion: 1 });
  expect(r, 200, "salvamento 2");
  r = await request("/api/stories/" + storyId + "/free-write", "PUT", { content: "obsoleto", expectedVersion: 0 });
  expect(r, 409, "conflito protegido");
  r = await request("/api/stories/" + storyId + "/writing-history?kind=FREEWRITE");
  expect(r, 200, "histórico de rascunhos"); assert.ok(r.body.versions.length >= 2);

  r = await request("/api/stories/" + storyId + "/chapters", "POST", { title: "Capítulo QA" });
  expect(r, 200, "novo capítulo"); const chapterId = r.body.id;
  r = await request("/api/stories/" + storyId + "/chapters/" + chapterId, "PATCH", { content: "texto original" });
  expect(r, 200, "salvar capítulo");
  r = await request("/api/stories/" + storyId + "/chapters/" + chapterId, "PATCH", { content: "texto alterado" });
  expect(r, 200, "salvar versão nova");
  r = await request("/api/stories/" + storyId + "/writing-history?kind=CHAPTER&chapterId=" + chapterId);
  expect(r, 200, "histórico de capítulos");
  const oldVersion = r.body.versions.find(v => v.excerpt === "texto original");
  assert.ok(oldVersion);
  r = await request("/api/stories/" + storyId + "/chapters/" + chapterId, "PATCH", { restoreVersionId: oldVersion.id });
  expect(r, 200, "recuperar capítulo"); assert.equal(r.body.chapter.content, "texto original");

  const session = await db.chatSession.create({ data: { storyId } });
  const message = await db.chatMessage.create({ data: { sessionId: session.id, role: "ASSISTANT", content: "Testes de propostas" } });
  const proposed = await db.floraProposal.create({ data: {
    id: randomUUID(), storyId, messageId: message.id, actionType: "add_character",
    payload: JSON.stringify({ name: "Personagem QA", role: "protagonista" }), description: "Proposta de personagem",
  } });
  r = await request("/api/stories/" + storyId + "/chat");
  expect(r, 200, "cartões persistentes"); assert.equal(r.body.messages[0].proposals[0].status, "PENDING");

  const event = await db.importantEvent.create({ data: {
    title: "Evento QA", description: "Proposta", storyId, suggestedBy: "COAUTHOR", isApproved: false,
  } });
  r = await request("/api/auth/login", "POST", {
    name: "QA Author B", email: "qa-b-" + prefix + "@example.test", password: "isolatedLongPassword2026",
  });
  expect(r, 200, "cadastro B"); cookie = r.cookie.split(";")[0];

  r = await request("/api/stories/" + storyId + "/flora-proposals/" + proposed.id, "PATCH", { decision: "APPROVED" });
  expect(r, 404, "acesso a proposta de outro usuário bloqueado");
  r = await request("/api/stories/" + storyId + "/chat");
  expect(r, 404, "chat de outro usuário bloqueado");
  r = await request("/api/suggestions/" + event.id + "/approve", "POST", {});
  expect(r, 404, "aprovação de evento de outro usuário bloqueada");
  r = await request("/api/suggestions/" + event.id + "/reject", "POST", {});
  expect(r, 404, "recusa de evento de outro usuário bloqueada");

  cookie = alice;
  r = await request("/api/stories/" + storyId + "/flora-proposals/" + proposed.id, "PATCH", { decision: "APPROVED" });
  expect(r, 200, "aprovação autorizada de ação");
  r = await request("/api/stories/" + storyId);
  expect(r, 200, "história após aprovação");
  assert.equal(r.body.characters.filter(c => c.name === "Personagem QA").length, 1);
  r = await request("/api/stories/" + storyId + "/flora-proposals/" + proposed.id, "PATCH", { decision: "APPROVED" });
  expect(r, 409, "execução dupla impedida");
  const discarded = await db.floraProposal.create({ data: {
    id: randomUUID(), storyId, messageId: message.id, actionType: "update_title",
    payload: JSON.stringify({ title: "TÍTULO NÃO AUTORIZADO" }), description: "Proposta de título",
  } });
  r = await request("/api/stories/" + storyId + "/flora-proposals/" + discarded.id, "PATCH", { decision: "REJECTED" });
  expect(r, 200, "recusa de ação");
  r = await request("/api/stories/" + storyId);
  expect(r, 200, "nenhuma alteração após recusa"); assert.equal(r.body.title, "QA Universe");
  r = await request("/api/suggestions/" + event.id + "/approve", "POST", {});
  expect(r, 200, "aprovação de evento pelo proprietário");
  r = await request("/api/stories/" + storyId);
  expect(r, 200, "evento persistido");
  assert.equal(r.body.events.find(e => e.id === event.id).isApproved, true);

  console.log("QA_PASS " + passed.length);
  console.log(passed.join("\n"));
}

main().catch(error => {
  console.error("QA_FAIL", error.stack);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
