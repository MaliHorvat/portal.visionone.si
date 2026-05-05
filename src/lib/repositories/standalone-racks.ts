import { prisma, isDbConfigured } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function listStandaloneRacks() {
  if (!isDbConfigured() || !prisma) return [];
  return prisma.standaloneRack.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getStandaloneRack(id: string) {
  if (!isDbConfigured() || !prisma) return null;
  return prisma.standaloneRack.findUnique({ where: { id } });
}

export async function createStandaloneRack(name: string, rackData: Prisma.InputJsonValue) {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  return prisma.standaloneRack.create({
    data: { name: name.trim() || "Rack", rackData },
  });
}

export async function updateStandaloneRack(id: string, patch: { name?: string; rackData?: Prisma.InputJsonValue }) {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  return prisma.standaloneRack.update({
    where: { id },
    data: patch,
  });
}

export async function deleteStandaloneRack(id: string) {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  await prisma.standaloneRack.delete({ where: { id } });
}
