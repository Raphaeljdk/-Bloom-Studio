import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/stats
 * Estatísticas globais para o painel admin.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const [users, stories, chapters, characters, messages] = await Promise.all([
    db.user.count(),
    db.story.count(),
    db.chapter.count(),
    db.character.count(),
    db.chatMessage.count(),
  ]);

  // Histórias criadas nos últimos 7 dias (por dia)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentStories = await db.story.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, title: true, userId: true },
    orderBy: { createdAt: "asc" },
  });

  // Agrupa por dia
  const byDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = 0;
  }
  recentStories.forEach((s) => {
    const key = s.createdAt.toISOString().slice(0, 10);
    if (key in byDay) byDay[key]++;
  });

  // Top 5 usuários com mais histórias
  const usersWithCounts = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { stories: true } },
    },
    orderBy: { stories: { _count: "desc" } },
    take: 5,
  });

  return NextResponse.json({
    counts: { users, stories, chapters, characters, messages },
    storiesByDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    topUsers: usersWithCounts.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      storiesCount: u._count.stories,
      createdAt: u.createdAt,
    })),
  });
}
