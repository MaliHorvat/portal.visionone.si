import { prisma, isDbConfigured } from "@/lib/db";

export async function appendAuditLog(username: string, action: string, details: string) {
  if (!isDbConfigured() || !prisma) return;
  await prisma.auditLog.create({
    data: { username: username || "portal", action, details },
  });
}

export async function listAuditLogs(limit = 100) {
  if (!isDbConfigured() || !prisma) return [];
  return prisma.auditLog.findMany({
    orderBy: { id: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });
}
