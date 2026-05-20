import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export async function listIpam(ownerUsername: string) {
  requireDb();
  return prisma!.portalIpamEntry.findMany({
    where: { ownerUsername },
    orderBy: { ip: "asc" },
  });
}

export async function replaceIpam(
  ownerUsername: string,
  rows: Array<{ ip: string; name: string; mac?: string }>,
) {
  requireDb();
  await prisma!.$transaction([
    prisma!.portalIpamEntry.deleteMany({ where: { ownerUsername } }),
    prisma!.portalIpamEntry.createMany({
      data: rows.map((r) => ({
        ownerUsername,
        ip: r.ip.trim(),
        name: r.name.trim(),
        mac: (r.mac ?? "").trim(),
      })),
    }),
  ]);
}
