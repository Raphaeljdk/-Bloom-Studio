import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canEditStory, ensureFloraProposalStorage } from "@/lib/writing-storage";
import { executeAction, type ParsedAction } from "@/lib/coauthor/action-parser";

type Params = { params: Promise<{ id: string; proposalId: string }> };
const ALLOWED = new Set([
  "add_character", "add_chapter", "add_timeline", "add_annotation",
  "update_title", "update_description", "add_event",
]);

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id, proposalId } = await params;
  if (!(await canEditStory(id, user.id)))
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (body?.decision !== "APPROVED" && body?.decision !== "REJECTED") {
    return NextResponse.json({ error: "Decisão inválida" }, { status: 400 });
  }

  try {
    await ensureFloraProposalStorage();
    const proposal = await db.$transaction(async (tx) => {
      // A linha bloqueada impede duas aprovações simultâneas.
      const rows = await tx.$queryRaw<Array<{
        id: string; actionType: string; payload: string; description: string; status: string;
      }>>`
        SELECT "id", "actionType", "payload", "description", "status"
        FROM "FloraProposal" WHERE "id" = ${proposalId} AND "storyId" = ${id}
        FOR UPDATE
      `;
      const current = rows[0];
      if (!current) throw new Error("NOT_FOUND");
      if (current.status !== "PENDING") throw new Error("ALREADY_DECIDED");

      if (body.decision === "APPROVED") {
        if (!ALLOWED.has(current.actionType)) throw new Error("INVALID_ACTION");
        const parsed = JSON.parse(current.payload) as Record<string, unknown>;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
            JSON.stringify(parsed).length > 3500 ||
            Object.values(parsed).some(value => value != null &&
              (typeof value !== "string" || value.length > 2000))) {
          throw new Error("INVALID_ACTION");
        }
        await executeAction({
          type: current.actionType as ParsedAction["type"],
          data: parsed,
          confirmation: current.description,
        }, id, tx);
      }
      return tx.floraProposal.update({
        where: { id: proposalId },
        data: { status: body.decision },
        select: { id: true, actionType: true, description: true, status: true },
      });
    });
    return NextResponse.json({ proposal });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    if (code === "ALREADY_DECIDED") return NextResponse.json({ error: "Proposta já decidida" }, { status: 409 });
    if (code === "INVALID_ACTION") return NextResponse.json({ error: "Ação não permitida" }, { status: 400 });
    console.error("[Flora proposal PATCH]", error);
    return NextResponse.json({ error: "Não foi possível aplicar a decisão" }, { status: 503 });
  }
}
