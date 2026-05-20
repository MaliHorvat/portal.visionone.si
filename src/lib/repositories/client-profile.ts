import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export async function getClientProfileNote(clientId: string) {
  requireDb();
  return prisma!.clientProfileNote.findUnique({ where: { clientId } });
}

export async function upsertClientProfileNote(clientId: string, content: string, updatedBy: string) {
  requireDb();
  return prisma!.clientProfileNote.upsert({
    where: { clientId },
    create: { clientId, content: content.trim(), updatedBy },
    update: { content: content.trim(), updatedBy },
  });
}

export async function listClientProfileChanges(clientId: string, limit = 100) {
  requireDb();
  return prisma!.clientProfileChangeLog.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function appendClientProfileChanges(
  clientId: string,
  username: string,
  changes: Array<{ field: string; oldValue: string; newValue: string }>,
) {
  if (!changes.length) return;
  requireDb();
  await prisma!.clientProfileChangeLog.createMany({
    data: changes.map((c) => ({
      clientId,
      field: c.field,
      oldValue: c.oldValue.slice(0, 8000),
      newValue: c.newValue.slice(0, 8000),
      username,
    })),
  });
}
