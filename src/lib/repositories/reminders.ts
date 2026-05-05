import { prisma, isDbConfigured } from "@/lib/db";
import { mockReminders } from "@/lib/mock-data";
import type { MaintenanceReminder, ReminderKind } from "@/lib/types";

function mapKind(k: string): ReminderKind {
  if (k === "ciscenje_kamer" || k === "diski" || k === "servis" || k === "drugo") return k;
  return "drugo";
}

export async function listReminders(): Promise<MaintenanceReminder[]> {
  if (!isDbConfigured() || !prisma) return mockReminders;
  const rows = await prisma.maintenanceReminder.findMany({
    include: { client: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.client?.name ?? "",
    title: r.title,
    dueDate: r.dueDate,
    kind: mapKind(r.kind),
    completed: r.completed,
  }));
}

export interface UpsertReminderInput {
  clientId: string;
  title: string;
  dueDate: string;
  kind?: ReminderKind;
  completed?: boolean;
}

export async function createReminder(data: UpsertReminderInput): Promise<MaintenanceReminder> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  const row = await prisma.maintenanceReminder.create({
    data: {
      clientId: data.clientId,
      title: data.title,
      dueDate: data.dueDate,
      kind: data.kind ?? "drugo",
      completed: data.completed ?? false,
    },
    include: { client: { select: { name: true } } },
  });
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client?.name ?? "",
    title: row.title,
    dueDate: row.dueDate,
    kind: mapKind(row.kind),
    completed: row.completed,
  };
}

export async function updateReminder(
  id: string,
  data: Partial<UpsertReminderInput>,
): Promise<MaintenanceReminder> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  const row = await prisma.maintenanceReminder.update({
    where: { id },
    data: {
      clientId: data.clientId,
      title: data.title,
      dueDate: data.dueDate,
      kind: data.kind,
      completed: data.completed,
    },
    include: { client: { select: { name: true } } },
  });
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client?.name ?? "",
    title: row.title,
    dueDate: row.dueDate,
    kind: mapKind(row.kind),
    completed: row.completed,
  };
}

export async function deleteReminder(id: string): Promise<void> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  await prisma.maintenanceReminder.delete({ where: { id } });
}
