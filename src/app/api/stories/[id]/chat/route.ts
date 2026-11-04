import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureFloraProposalStorage } from "@/lib/writing-storage";
import { sendToFlora } from "@/lib/coauthor/coauthor.service";

// Vercel: permite até 60s para a função serverless (plano Hobby padrão é 10s)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/stories/[id]/chat
 * Retorna histórico completo de mensagens + sugestões vinculadas.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const story = await db.story.findFirst({ where: { id, userId: user.id } });
  if (!story) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const session = await db.chatSession.findFirst({
    where: { storyId: id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    return NextResponse.json({ messages: [] });
  }

  await ensureFloraProposalStorage();
  const proposals = await db.floraProposal.findMany({
    where: { storyId: id, messageId: { in: session.messages.map(m => m.id) } },
    select: { id: true, messageId: true, actionType: true, description: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const byMessage = new Map<string, typeof proposals>();
  for (const proposal of proposals) {
    byMessage.set(proposal.messageId, [...(byMessage.get(proposal.messageId) || []), proposal]);
  }

  // Para cada mensagem com suggestionRef, busca o evento vinculado
  const messagesWithSuggestions = await Promise.all(
    session.messages.map(async (m) => {
      let suggestion: { id: string; title: string; description: string; impact: string | null; isApproved: boolean; isRejected: boolean } | undefined;
      if (m.suggestionRef) {
        const event = await db.importantEvent.findUnique({
          where: { id: m.suggestionRef },
        });
        if (event) {
          suggestion = {
            id: event.id,
            title: event.title,
            description: event.description,
            impact: event.impact,
            isApproved: event.isApproved,
            isRejected: false,
          };
        }
      }
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        suggestionRef: m.suggestionRef,
        suggestionType: m.suggestionType,
        isApproved: m.isApproved,
        createdAt: m.createdAt,
        suggestion,
        proposals: byMessage.get(m.id) || [],
      };
    })
  );

  return NextResponse.json({ messages: messagesWithSuggestions });
}

/**
 * POST /api/stories/[id]/chat
 * Envia mensagem do usuário para a Flora e retorna a resposta processada.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const story = await db.story.findFirst({ where: { id, userId: user.id } });
  if (!story) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const content = body?.content;
  if (typeof content !== "string" || !content.trim() || content.length > 4000) {
    return NextResponse.json({ error: "Mensagem vazia ou acima de 4.000 caracteres" }, { status: 400 });
  }

  try {
    const result = await sendToFlora({ storyId: id, userMessage: content.trim() });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[chat] erro:", err);
    return NextResponse.json({ error: "A Flora não conseguiu responder. Tente novamente." }, { status: 500 });
  }
}
