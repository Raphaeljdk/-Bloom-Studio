import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

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
  const { content, target, targetId, metadata } = body as {
    content: string;
    target: "chapter" | "character" | "timeline" | "event" | "annotation" | "freewrite";
    targetId?: string;
    metadata?: { title?: string; role?: string; category?: string; date?: string; impact?: string };
  };

  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo vazio" }, { status: 400 });
  const cleanContent = content.trim();

  try {
    switch (target) {
      case "chapter": {
        if (targetId) {
          const chapter = await db.chapter.findFirst({ where: { id: targetId, storyId: id } });
          if (!chapter) return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
          const newContent = chapter.content ? `${chapter.content}\n\n${cleanContent}` : cleanContent;
          await db.chapter.update({ where: { id: targetId }, data: { content: newContent } });
          return NextResponse.json({ ok: true, message: `Adicionado ao capítulo ${chapter.number}` });
        } else {
          const last = await db.chapter.findFirst({ where: { storyId: id }, orderBy: { number: "desc" } });
          const number = (last?.number || 0) + 1;
          const newChapter = await db.chapter.create({
            data: { number, title: metadata?.title || `Capítulo ${number}`, content: cleanContent, status: "WRITING", storyId: id },
          });
          return NextResponse.json({ ok: true, message: `Novo capítulo criado: ${newChapter.title}` });
        }
      }
      case "character": {
        const newChar = await db.character.create({
          data: { name: metadata?.title || cleanContent.split("\n")[0].slice(0, 80), description: cleanContent, role: metadata?.role || null, storyId: id },
        });
        return NextResponse.json({ ok: true, message: `Personagem adicionado: ${newChar.name}` });
      }
      case "timeline": {
        const last = await db.timelineEvent.findFirst({ where: { storyId: id }, orderBy: { order: "desc" } });
        const order = (last?.order || 0) + 1;
        const newEvent = await db.timelineEvent.create({
          data: { title: metadata?.title || cleanContent.split("\n")[0].slice(0, 80), description: cleanContent, date: metadata?.date || null, order, storyId: id },
        });
        return NextResponse.json({ ok: true, message: `Evento cronológico adicionado: ${newEvent.title}` });
      }
      case "event": {
        const newEvent = await db.importantEvent.create({
          data: { title: metadata?.title || cleanContent.split("\n")[0].slice(0, 80), description: cleanContent, impact: metadata?.impact || null, isApproved: true, suggestedBy: "USER", storyId: id },
        });
        return NextResponse.json({ ok: true, message: `Acontecimento importante adicionado: ${newEvent.title}` });
      }
      case "annotation": {
        const newAnn = await db.annotation.create({
          data: { content: cleanContent, category: (metadata?.category || "IDEA").toUpperCase(), storyId: id },
        });
        return NextResponse.json({ ok: true, message: `Anotação adicionada (${newAnn.category})` });
      }
      case "freewrite": {
        return NextResponse.json({ ok: true, message: "Conteúdo enviado para escrita livre (localStorage)", freewrite: true, content: cleanContent });
      }
      default:
        return NextResponse.json({ error: "Destino inválido" }, { status: 400 });
    }
  } catch (err) {
    console.error("[add-to-document] erro:", err);
    return NextResponse.json({ error: "Erro ao adicionar" }, { status: 500 });
  }
}
