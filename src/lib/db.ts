import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaSchemaHash: string | undefined
}

// Hash simples do schema para detectar mudanças
const SCHEMA_HASH = 'writing-history-flora-v2'

// Recria o cliente se o schema mudou
if (globalForPrisma.__prismaSchemaHash !== SCHEMA_HASH) {
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {})
  }
  globalForPrisma.prisma = undefined
  globalForPrisma.__prismaSchemaHash = SCHEMA_HASH
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Não registrar consultas que podem conter textos literários ou dados pessoais.
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
