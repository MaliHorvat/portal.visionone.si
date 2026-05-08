import { prisma, isDbConfigured } from "@/lib/db";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export async function listTimeLogs(clientId: string) {
  requireDb();
  return prisma!.clientTimeLog.findMany({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createTimeLog(
  clientId: string,
  data: {
    workDate: string;
    technician: string;
    hours: number;
    hourlyRate: number;
    note?: string;
    timeRangeLabel?: string;
    startedAt?: Date | null;
    endedAt?: Date | null;
  },
) {
  requireDb();
  const costComputed = Math.round(data.hours * data.hourlyRate * 100) / 100;
  return prisma!.clientTimeLog.create({
    data: {
      clientId,
      workDate: data.workDate,
      technician: data.technician,
      note: data.note ?? "",
      timeRangeLabel: data.timeRangeLabel?.trim() ?? "",
      startedAt: data.startedAt ?? null,
      endedAt: data.endedAt ?? null,
      hours: data.hours,
      hourlyRate: data.hourlyRate,
      costComputed,
    },
  });
}

export async function stopTimeLog(id: string, endedAt: Date = new Date()) {
  requireDb();
  const row = await prisma!.clientTimeLog.findUnique({ where: { id } });
  if (!row) throw new Error("Ni najdeno.");
  if (!row.startedAt) throw new Error("Časovnik ni bil zagnan.");
  if (row.endedAt) return row;
  const ms = endedAt.getTime() - row.startedAt.getTime();
  const hours = Math.max(0, Math.round((ms / 36e5) * 100) / 100);
  const costComputed = Math.round(hours * row.hourlyRate * 100) / 100;
  return prisma!.clientTimeLog.update({
    where: { id },
    data: { endedAt, hours, costComputed },
  });
}

export async function updateTimeLog(
  id: string,
  patch: Partial<{ note: string; hourlyRate: number; workDate: string; technician: string }>,
) {
  requireDb();
  const data: Record<string, unknown> = {};
  if (patch.note !== undefined) data.note = patch.note;
  if (patch.hourlyRate !== undefined) data.hourlyRate = patch.hourlyRate;
  if (patch.workDate !== undefined) data.workDate = patch.workDate;
  if (patch.technician !== undefined) data.technician = patch.technician;
  const updated = await prisma!.clientTimeLog.update({ where: { id }, data });
  if (patch.hourlyRate !== undefined) {
    const costComputed = Math.round(updated.hours * updated.hourlyRate * 100) / 100;
    return prisma!.clientTimeLog.update({ where: { id }, data: { costComputed } });
  }
  return updated;
}

export async function deleteTimeLog(id: string) {
  requireDb();
  await prisma!.clientTimeLog.delete({ where: { id } });
}
