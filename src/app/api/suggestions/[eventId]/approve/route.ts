import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { approveSuggestion } from "@/lib/coauthor/coauthor.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { eventId } = await params;
  try {
    await approveSuggestion(eventId, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 });
    console.error("[approve] erro:", err);
    return NextResponse.json({ error: "Erro ao aprovar" }, { status: 500 });
  }
}
