import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// ── SINGLETON DE PRISMA ──────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Prisma 7 requiere usar un adaptador (Driver Adapter) para la conexión a DB.
const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}