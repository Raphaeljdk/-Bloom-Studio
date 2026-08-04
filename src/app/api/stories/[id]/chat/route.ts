import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendToFlora } from "@/lib/coauthor/coauthor.service";

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

  // Para cada mensagem com suggestionRef, busca o evento vinculado
  const messagesWithSuggestions = await Promise.all(
    session.messages.map(async (m) => {
      let suggestion = undefined;
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

  const body = await req.json();
  const { content } = body;
  if (!content?.trim()) {
    return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 });
  }

  try {
    const result = await sendToFlora({ storyId: id, userMessage: content.trim() });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[chat] erro:", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
