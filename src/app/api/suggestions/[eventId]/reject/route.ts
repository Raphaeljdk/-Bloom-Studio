import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectSuggestion } from "@/lib/coauthor/coauthor.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { eventId } = await params;
  try {
    await rejectSuggestion(eventId, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 });
    console.error("[reject] erro:", err);
    return NextResponse.json({ error: "Erro ao recusar" }, { status: 500 });
  }
}
