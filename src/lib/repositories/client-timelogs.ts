import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export async function listTimeLogs(clientId: string) {
  requireDb();
  return prisma!.clientTimeLog.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTimeLog(
  clientId: string,
  data: { workDate: string; technician: string; hours: number; hourlyRate: number },
) {
  requireDb();
  const costComputed = Math.round(data.hours * data.hourlyRate * 100) / 100;
  return prisma!.clientTimeLog.create({
    data: {
      clientId,
      workDate: data.workDate,
      technician: data.technician,
      hours: data.hours,
      hourlyRate: data.hourlyRate,
      costComputed,
    },
  });
}

export async function deleteTimeLog(id: string) {
  requireDb();
  await prisma!.clientTimeLog.delete({ where: { id } });
}
