import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureWritingStorage, ensureFloraProposalStorage } from "@/lib/writing-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Exporta somente os dados literários da história autenticada.
 * Não expõe usuários, credenciais ou outras histórias.
 * Download acontece diretamente no navegador e não cria arquivos no servidor.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const story = await db.story.findFirst({
    where: { id, userId: user.id },
    include: {
      characters: true,
      chapters: { orderBy: { number: "asc" } },
      timelineEvents: { orderBy: { order: "asc" } },
      importantEvents: true,
      annotations: true,
      chatSessions: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!story) return NextResponse.json({ error: "História não encontrada" }, { status: 404 });

  try {
    await Promise.all([ensureWritingStorage(), ensureFloraProposalStorage()]);
    const [freeWrite, versions, proposals] = await Promise.all([
      db.freeWriteDraft.findUnique({ where: { storyId: id } }),
      db.writingVersion.findMany({ where: { storyId: id }, orderBy: { createdAt: "asc" } }),
      db.floraProposal.findMany({ where: { storyId: id }, orderBy: { createdAt: "asc" } }),
    ]);
    const payload = {
      format: "bloom-studio-backup",
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      story: { ...story, userId: undefined },
      freeWrite,
      versions,
      proposals,
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="bloom-story-${id.replace(/[^a-z0-9_-]/gi, "")}.json"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[backup story]", error);
    return NextResponse.json({ error: "Não foi possível gerar o backup da história" }, { status: 503 });
  }
}
