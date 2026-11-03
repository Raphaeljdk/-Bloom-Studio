import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canEditStory, ensureWritingStorage } from "@/lib/writing-storage";

type Params = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await canEditStory(id, user.id)))
    return NextResponse.json({ error: "História não encontrada" }, { status: 404 });

  try {
    await ensureWritingStorage();
    const rows = await db.$queryRaw<Array<{ content: string; version: number; updatedAt: Date }>>`
      SELECT "content", "version", "updatedAt" FROM "FreeWriteDraft" WHERE "storyId" = ${id}
    `;
    return NextResponse.json(rows[0] || { content: "", version: 0, updatedAt: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[free-write GET]", error);
    return NextResponse.json({ error: "Armazenamento indisponível. Seu rascunho local foi preservado." }, { status: 503 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await canEditStory(id, user.id)))
    return NextResponse.json({ error: "História não encontrada" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const content = body?.content;
  const expectedVersion = body?.expectedVersion;
  if (typeof content !== "string" || content.length > 250_000 ||
      !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return NextResponse.json({ error: "Texto inválido ou versão ausente" }, { status: 400 });
  }

  try {
    await ensureWritingStorage();
    const draft = await db.$transaction(async (tx) => {
      // Cria somente se não existir; bloqueia a linha contra alterações concorrentes.
      await tx.$executeRaw`
        INSERT INTO "FreeWriteDraft" ("storyId", "content", "version", "updatedAt")
        VALUES (${id}, '', 0, CURRENT_TIMESTAMP)
        ON CONFLICT ("storyId") DO NOTHING
      `;
      const rows = await tx.$queryRaw<Array<{ content: string; version: number }>>`
        SELECT "content", "version" FROM "FreeWriteDraft"
        WHERE "storyId" = ${id} FOR UPDATE
      `;
      const previous = rows[0];
      if (!previous || previous.version !== expectedVersion)
        throw new Error("VERSION_CONFLICT");
      if (previous.content === content) {
        return { content, version: previous.version, updatedAt: new Date() };
      }
      await tx.$executeRaw`
        UPDATE "FreeWriteDraft" SET "content" = ${content},
          "version" = ${previous.version + 1}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "storyId" = ${id}
      `;
      // Primeira versão: guarda também o conteúdo anterior, caso já existisse.
      if (previous.version > 0) {
        const firstRevision = await tx.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS(SELECT 1 FROM "WritingVersion"
            WHERE "storyId" = ${id} AND "kind" = 'FREEWRITE') AS "exists"
        `;
        if (!firstRevision[0]?.exists && previous.content) {
          await tx.$executeRaw`
            INSERT INTO "WritingVersion" ("id","storyId","chapterId","kind","content")
            VALUES (${randomUUID()}, ${id}, NULL, 'FREEWRITE', ${previous.content})
          `;
        }
      }
      await tx.$executeRaw`
        INSERT INTO "WritingVersion" ("id","storyId","chapterId","kind","content")
        VALUES (${randomUUID()}, ${id}, NULL, 'FREEWRITE', ${content})
      `;
      return { content, version: previous.version + 1, updatedAt: new Date() };
    });
    return NextResponse.json(draft);
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT")
      return NextResponse.json({ error: "O texto foi alterado em outra sessão. Recupere a versão do servidor antes de salvar." }, { status: 409 });
    console.error("[free-write PUT]", error);
    return NextResponse.json({ error: "Não foi possível salvar no banco. Sua cópia local permanece disponível." }, { status: 503 });
  }
}
