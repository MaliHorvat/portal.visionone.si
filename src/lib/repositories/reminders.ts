import { prisma, isDbConfigured } from "@/lib/db";
import { mockReminders } from "@/lib/mock-data";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";
import type { MaintenanceReminder, ReminderKind } from "@/lib/types";

const VALID_KINDS: ReminderKind[] = [
  "ciscenje_kamer",
  "diski",
  "servis",
  "menjava_diska",
  "preventivni_pregled",
  "fw_posodobitev",
  "baterije_ups",
  "pregled_sistema",
  "certifikati",
  "drugo",
];

function mapKind(k: string): ReminderKind {
  return VALID_KINDS.includes(k as ReminderKind) ? (k as ReminderKind) : "drugo";
}

function mapRow(r: {
  id: string;
  clientId: string;
  title: string;
  dueDate: string;
  kind: string;
  completed: boolean;
  clientVisible?: boolean;
  client?: { name: string } | null;
}): MaintenanceReminder {
  return {
    id: r.id,
    clientId: r.clientId,
    clientName: r.client?.name ?? "",
    title: r.title,
    dueDate: r.dueDate,
    kind: mapKind(r.kind),
    completed: r.completed,
    clientVisible: r.clientVisible !== false,
  };
}

export async function listReminders(clientId?: string): Promise<MaintenanceReminder[]> {
  if (!isDbConfigured() || !prisma) {
    const all = mockReminders;
    return clientId ? all.filter((r) => r.clientId === clientId) : all;
  }
  const rows = await prisma.maintenanceReminder.findMany({
    where: clientId ? { clientId } : undefined,
    include: { client: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });
  return rows.map(mapRow);
}

export async function listRemindersForSession(
  session?: Pick<PortalSessionPayload, "role" | "username">,
  clientId?: string,
  opts?: { clientVisibleOnly?: boolean },
): Promise<MaintenanceReminder[]> {
  if (!isDbConfigured() || !prisma) {
    const all = await listReminders(clientId);
    return opts?.clientVisibleOnly ? all.filter((r) => r.clientVisible) : all;
  }
  const owner = session?.username?.trim();
  const where = {
    ...(clientId ? { clientId } : {}),
    client: { ownerUsername: owner ?? "__portal_no_owner__" },
    ...(opts?.clientVisibleOnly ? { clientVisible: true } : {}),
  };
  const rows = await prisma.maintenanceReminder.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
  });
  return rows.map(mapRow);
}

export interface UpsertReminderInput {
  clientId: string;
  title: string;
  dueDate: string;
  kind?: ReminderKind;
  completed?: boolean;
  clientVisible?: boolean;
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
      clientVisible: data.clientVisible !== false,
    },
    include: { client: { select: { name: true } } },
  });
  return mapRow(row);
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
      clientVisible: data.clientVisible,
    },
    include: { client: { select: { name: true } } },
  });
  return mapRow(row);
}

export async function deleteReminder(id: string): Promise<void> {
  if (!isDbConfigured() || !prisma) {
    throw new Error("DB ni nastavljena.");
  }
  await prisma.maintenanceReminder.delete({ where: { id } });
}

export async function reminderBelongsToSession(
  reminderId: string,
  session: Pick<PortalSessionPayload, "username">,
): Promise<boolean> {
  if (!isDbConfigured() || !prisma) return false;
  const owner = session.username?.trim();
  if (!owner) return false;
  const row = await prisma.maintenanceReminder.findFirst({
    where: { id: reminderId, client: { ownerUsername: owner } },
    select: { id: true },
  });
  return !!row;
}
