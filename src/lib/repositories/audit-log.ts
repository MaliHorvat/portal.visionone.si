import { prisma, isDbConfigured } from "@/lib/db";

export async function appendAuditLog(username: string, action: string, details: string) {
  if (!isDbConfigured() || !prisma) return;
  await prisma.auditLog.create({
    data: { username: username || "portal", action, details },
  });
}

export async function listAuditLogs(limit = 100, filterUsername?: string) {
  if (!isDbConfigured() || !prisma) return [];
  const u = filterUsername?.trim();
  return prisma.auditLog.findMany({
    where: u ? { username: u } : undefined,
    orderBy: { id: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });
}
