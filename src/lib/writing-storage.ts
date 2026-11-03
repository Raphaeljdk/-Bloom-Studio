import { db } from "@/lib/db";

// Migração aditiva e idempotente: não altera nem remove tabelas antigas.
// Necessária porque o projeto atual não executa migrations em deploys da Vercel.
// Estes SQLs são estáticos, sem entrada de usuários.
let ready: Promise<void> | undefined;

export function ensureWritingStorage(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "FreeWriteDraft" (
          "storyId" TEXT PRIMARY KEY REFERENCES "Story"("id") ON DELETE CASCADE,
          "content" TEXT NOT NULL DEFAULT '',
          "version" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WritingVersion" (
          "id" TEXT PRIMARY KEY,
          "storyId" TEXT NOT NULL REFERENCES "Story"("id") ON DELETE CASCADE,
          "chapterId" TEXT REFERENCES "Chapter"("id") ON DELETE CASCADE,
          "kind" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "title" TEXT,
          "summary" TEXT,
          "status" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "WritingVersion_story_kind_date_idx"
          ON "WritingVersion" ("storyId", "kind", "createdAt" DESC)`);
      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "WritingVersion_chapter_date_idx"
          ON "WritingVersion" ("chapterId", "createdAt" DESC)`);
    })().catch((error) => {
      ready = undefined; // uma falha de conexão não impede tentativas futuras
      throw error;
    });
  }
  return ready;
}

export interface WritingVersionListItem {
  id: string;
  createdAt: Date;
  excerpt: string;
  characters: number;
  title: string | null;
}

export async function canEditStory(storyId: string, userId: string) {
  return !!(await db.story.findFirst({ where: { id: storyId, userId }, select: { id: true } }));
}
