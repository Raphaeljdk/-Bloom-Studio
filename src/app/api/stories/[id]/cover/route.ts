import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";
import { promises as fs } from "fs";
import path from "path";

const COVER_STYLES: Record<string, { label: string; promptSuffix: string }> = {
  watercolor: {
    label: "Aquarela",
    promptSuffix:
      "soft watercolor painting style, delicate brushstrokes, pastel colors, dreamy atmosphere, artistic book cover",
  },
  digital: {
    label: "Digital Art",
    promptSuffix:
      "digital painting, concept art style, detailed, vibrant colors, professional book cover illustration",
  },
  photographic: {
    label: "Fotográfico",
    promptSuffix:
      "cinematic photography style, dramatic lighting, realistic, atmospheric, professional book cover",
  },
  minimalist: {
    label: "Minimalista",
    promptSuffix:
      "minimalist book cover design, simple geometric shapes, elegant typography space, modern, sophisticated, lots of negative space",
  },
  vintage: {
    label: "Vintage",
    promptSuffix:
      "vintage book cover, retro illustration, aged paper texture, classic literature style, ornate borders",
  },
  fantasy: {
    label: "Fantasia",
    promptSuffix:
      "epic fantasy book cover art, magical atmosphere, intricate details, dramatic lighting, painterly style",
  },
};

/**
 * POST /api/stories/[id]/cover
 * Gera capa da história via IA com base no título, descrição, gênero e tom.
 *
 * Body: { style?: "watercolor" | "digital" | "photographic" | "minimalist" | "vintage" | "fantasy" }
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

  const body = await req.json().catch(() => ({}));
  const styleKey = body.style || "watercolor";
  const style = COVER_STYLES[styleKey] || COVER_STYLES.watercolor;

  // Constrói prompt detalhado
  const promptParts: string[] = [];
  if (story.title) promptParts.push(`book cover illustration inspired by the title "${story.title}"`);
  if (story.description) promptParts.push(`the story is about: ${story.description.slice(0, 200)}`);
  if (story.genre) promptParts.push(`genre: ${story.genre}`);
  if (story.tone) promptParts.push(`mood: ${story.tone}`);
  promptParts.push(style.promptSuffix);
  promptParts.push("vertical book cover composition, no text, no letters, no typography, pure illustration, portrait orientation, high quality, detailed");

  const prompt = promptParts.join(", ");

  try {
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: "768x1344", // portrait — formato de capa de livro
    });

    const imageBase64 = response.data?.[0]?.base64;
    if (!imageBase64) {
      return NextResponse.json({ error: "IA não retornou imagem" }, { status: 500 });
    }

    // Salva no sistema de arquivos (public/covers)
    const coversDir = path.join(process.cwd(), "public", "covers");
    await fs.mkdir(coversDir, { recursive: true });
    const filename = `${id}-${Date.now()}.png`;
    const filepath = path.join(coversDir, filename);
    const buffer = Buffer.from(imageBase64, "base64");
    await fs.writeFile(filepath, buffer);

    const coverUrl = `/covers/${filename}`;

    // Atualiza a história com a nova capa
    // Usa executeRaw como fallback caso o Prisma Client em cache não tenha os campos novos
    try {
      await db.story.update({
        where: { id },
        data: { coverUrl, coverStyle: styleKey },
      });
    } catch (updateErr) {
      console.warn("[cover] db.update falhou, tentando SQL direto:", updateErr instanceof Error ? updateErr.message : "");
      // Fallback: SQL direto (SQLite)
      await db.$executeRaw`UPDATE Story SET coverUrl = ${coverUrl}, coverStyle = ${styleKey}, updatedAt = ${new Date()} WHERE id = ${id}`;
    }

    return NextResponse.json({
      coverUrl,
      coverStyle: styleKey,
      styleLabel: style.label,
    });
  } catch (err) {
    console.error("[cover] erro:", err);
    const message = err instanceof Error ? err.message : "Erro ao gerar capa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/stories/[id]/cover
 * Remove a capa da história.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const story = await db.story.findFirst({ where: { id, userId: user.id } });
  if (!story) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  await db.story.update({
    where: { id },
    data: { coverUrl: null, coverStyle: null },
  });

  return NextResponse.json({ ok: true });
}

export const COVER_STYLE_OPTIONS = Object.entries(COVER_STYLES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));
