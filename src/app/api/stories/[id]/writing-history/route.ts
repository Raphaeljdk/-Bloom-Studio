import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canEditStory, ensureWritingStorage } from "@/lib/writing-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!(await canEditStory(id, user.id)))
    return NextResponse.json({ error: "História não encontrada" }, { status: 404 });

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const chapterId = url.searchParams.get("chapterId");
  const versionId = url.searchParams.get("versionId");
  if (kind !== "FREEWRITE" && kind !== "CHAPTER")
    return NextResponse.json({ error: "Tipo de histórico inválido" }, { status: 400 });
  if (kind === "CHAPTER") {
    if (!chapterId) return NextResponse.json({ error: "Capítulo obrigatório" }, { status: 400 });
    const chapter = await db.chapter.findFirst({ where: { id: chapterId, storyId: id }, select: { id: true } });
    if (!chapter) return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
  }

  try {
    await ensureWritingStorage();
    if (versionId) {
      const rows = await db.$queryRaw<Array<{
        id: string; content: string; title: string | null; summary: string | null;
        status: string | null; createdAt: Date;
      }>>`
        SELECT "id", "content", "title", "summary", "status", "createdAt"
        FROM "WritingVersion"
        WHERE "id" = ${versionId} AND "storyId" = ${id} AND "kind" = ${kind}
          AND (${kind} = 'FREEWRITE' AND "chapterId" IS NULL OR
               ${kind} = 'CHAPTER' AND "chapterId" = ${chapterId})
        LIMIT 1
      `;
      if (!rows[0]) return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
      return NextResponse.json({ version: rows[0] }, { headers: { "Cache-Control": "no-store" } });
    }
    const rows = await db.$queryRaw<Array<{
      id: string; createdAt: Date; excerpt: string; characters: number; title: string | null;
    }>>`
      SELECT "id", "createdAt", LEFT("content", 120) AS "excerpt",
        LENGTH("content")::integer AS "characters", "title"
      FROM "WritingVersion"
      WHERE "storyId" = ${id} AND "kind" = ${kind}
        AND (${kind} = 'FREEWRITE' AND "chapterId" IS NULL OR
             ${kind} = 'CHAPTER' AND "chapterId" = ${chapterId})
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 50
    `;
    return NextResponse.json({ versions: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[writing history]", error);
    return NextResponse.json({ error: "Não foi possível carregar o histórico" }, { status: 503 });
  }
}
