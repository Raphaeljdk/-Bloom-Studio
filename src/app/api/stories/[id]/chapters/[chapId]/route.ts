import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureWritingStorage } from "@/lib/writing-storage";

type Params = { params: Promise<{ id: string; chapId: string }> };
const STATES = new Set(["DRAFT", "WRITING", "REVISION", "COMPLETED"]);

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id, chapId } = await params;
  const chapter = await db.chapter.findFirst({
    where: { id: chapId, storyId: id, story: { userId: user.id } },
  });
  if (!chapter) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const restoring = typeof body.restoreVersionId === "string";
  const { number, title, summary, content, status } = body;

  if (!restoring && (
    (number !== undefined && (!Number.isInteger(number) || number <= 0)) ||
    (title !== undefined && title !== null && (typeof title !== "string" || title.length > 250)) ||
    (summary !== undefined && summary !== null && (typeof summary !== "string" || summary.length > 10000)) ||
    (content !== undefined && content !== null && (typeof content !== "string" || content.length > 500000)) ||
    (status !== undefined && !STATES.has(status))
  )) return NextResponse.json({ error: "Campos inválidos ou texto muito longo" }, { status: 400 });

  try {
    await ensureWritingStorage();
    const updated = await db.$transaction(async (tx) => {
      // Serializa edições/recuperações concorrentes do mesmo capítulo.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Chapter" WHERE "id" = ${chapId} AND "storyId" = ${id} FOR UPDATE
      `;
      if (!locked[0]) throw new Error("NOT_FOUND");
      const previous = await tx.chapter.findUniqueOrThrow({ where: { id: chapId } });

      let patch: Partial<{ number: number; title: string | null; summary: string | null;
        content: string | null; status: string }> = {};

      if (restoring) {
        const versions = await tx.$queryRaw<Array<{
          title: string | null; summary: string | null; content: string; status: string | null;
        }>>`
          SELECT "title","summary","content","status" FROM "WritingVersion"
          WHERE "id" = ${body.restoreVersionId} AND "storyId" = ${id}
            AND "chapterId" = ${chapId} AND "kind" = 'CHAPTER'
          LIMIT 1
        `;
        if (!versions[0]) throw new Error("VERSION_NOT_FOUND");
        patch = {
          title: versions[0].title,
          summary: versions[0].summary,
          content: versions[0].content,
          status: versions[0].status && STATES.has(versions[0].status) ? versions[0].status : previous.status,
        };
      } else {
        patch = {
          ...(number !== undefined && { number }),
          ...(title !== undefined && { title }),
          ...(summary !== undefined && { summary }),
          ...(content !== undefined && { content }),
          ...(status !== undefined && { status }),
        };
      }

      if (Object.keys(patch).length === 0 ||
          Object.entries(patch).every(([key, value]) => previous[key as keyof typeof previous] === value)) {
        return previous;
      }

      const revisionCount = await tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS "count" FROM "WritingVersion"
        WHERE "storyId" = ${id} AND "chapterId" = ${chapId} AND "kind" = 'CHAPTER'
      `;
      if (revisionCount[0]?.count === 0n) {
        await tx.$executeRaw`
          INSERT INTO "WritingVersion" ("id","storyId","chapterId","kind","content","title","summary","status")
          VALUES (${randomUUID()},${id},${chapId},'CHAPTER',
                  ${previous.content || ""},${previous.title},${previous.summary},${previous.status})
        `;
      }
      const next = await tx.chapter.update({ where: { id: chapId }, data: patch });
      await tx.$executeRaw`
        INSERT INTO "WritingVersion" ("id","storyId","chapterId","kind","content","title","summary","status")
        VALUES (${randomUUID()},${id},${chapId},'CHAPTER',
                ${next.content || ""},${next.title},${next.summary},${next.status})
      `;
      return next;
    });

    return NextResponse.json({ ok: true, chapter: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_NOT_FOUND")
      return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
    if (error instanceof Error && error.message === "NOT_FOUND")
      return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
    console.error("[chapter PATCH history]", error);
    return NextResponse.json({ error: "Não foi possível salvar o capítulo com segurança" }, { status: 503 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id, chapId } = await params;
  await db.chapter.deleteMany({
    where: { id: chapId, storyId: id, story: { userId: user.id } },
  });
  return new NextResponse(null, { status: 204 });
}
