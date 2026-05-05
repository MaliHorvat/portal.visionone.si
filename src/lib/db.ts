import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient | undefined {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }
  try {
    return new PrismaClient({ log: ["error", "warn"] });
  } catch (err) {
    console.warn("[db] Prisma client init failed:", err);
    return undefined;
  }
}

export const prisma: PrismaClient | undefined =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production" && prisma) {
  globalForPrisma.prisma = prisma;
}

export const isDbConfigured = (): boolean => Boolean(prisma);
