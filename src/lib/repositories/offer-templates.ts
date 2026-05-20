import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export type TemplateLine = {
  section?: string;
  code?: string;
  description?: string;
  unit?: string;
  qty?: number;
  unitPrice?: number;
  discountPct?: number;
  lineVatPct?: number;
};

export async function listOfferTemplates(ownerUsername: string, isAdmin: boolean) {
  requireDb();
  return prisma!.offerTemplate.findMany({
    where: isAdmin ? {} : { ownerUsername },
    orderBy: { name: "asc" },
  });
}

export async function createOfferTemplate(ownerUsername: string, name: string, lines: TemplateLine[]) {
  requireDb();
  return prisma!.offerTemplate.create({
    data: { ownerUsername, name: name.trim(), lines: lines as object },
  });
}

export async function getOfferTemplate(id: string, ownerUsername: string, isAdmin: boolean) {
  requireDb();
  return prisma!.offerTemplate.findFirst({
    where: isAdmin ? { id } : { id, ownerUsername },
  });
}

export async function deleteOfferTemplate(id: string, ownerUsername: string, isAdmin: boolean) {
  requireDb();
  await prisma!.offerTemplate.deleteMany({
    where: isAdmin ? { id } : { id, ownerUsername },
  });
}
