import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export async function listSiteSurveys(clientId: string) {
  requireDb();
  return prisma!.clientSiteSurvey.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createSiteSurvey(clientId: string) {
  requireDb();
  return prisma!.clientSiteSurvey.create({ data: { clientId } });
}

export async function updateSiteSurvey(
  id: string,
  data: Partial<{
    surveyDate: string;
    objectType: string;
    ceilingHeight: string;
    cabling: string;
    powerSupply: string;
    lighting: string;
    notes: string;
  }>,
) {
  requireDb();
  return prisma!.clientSiteSurvey.update({ where: { id }, data });
}

export async function deleteSiteSurvey(id: string) {
  requireDb();
  await prisma!.clientSiteSurvey.delete({ where: { id } });
}
