import { isDbConfigured, prisma } from "@/lib/db";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";
import type { ServiceRequest, ServiceRequestPriority, ServiceRequestStatus } from "@/lib/types";

type SessionPick = Pick<PortalSessionPayload, "username">;

function ownerWhere(session?: SessionPick) {
  const owner = session?.username?.trim();
  return { ownerUsername: owner || "__portal_no_owner__" };
}

function mapRow(row: {
  id: string;
  ownerUsername: string;
  clientId: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  createdBy: string;
  assignee: string;
  createdAt: Date;
  updatedAt: Date;
  client: { name: string } | null;
}): ServiceRequest {
  return {
    id: row.id,
    ownerUsername: row.ownerUsername,
    clientId: row.clientId,
    clientName: row.client?.name ?? "",
    title: row.title,
    description: row.description,
    status: (row.status as ServiceRequestStatus) || "new",
    priority: (row.priority as ServiceRequestPriority) || "medium",
    dueDate: row.dueDate,
    createdBy: row.createdBy,
    assignee: row.assignee,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface UpsertServiceRequestInput {
  clientId?: string | null;
  title?: string;
  description?: string;
  status?: ServiceRequestStatus;
  priority?: ServiceRequestPriority;
  dueDate?: string;
  assignee?: string;
}

export async function listServiceRequestsForSession(session?: SessionPick): Promise<ServiceRequest[]> {
  if (!isDbConfigured() || !prisma) return [];
  const rows = await prisma.serviceRequest.findMany({
    where: ownerWhere(session),
    include: { client: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
    take: 300,
  });
  return rows.map(mapRow);
}

export async function getServiceRequestForSession(id: string, session?: SessionPick): Promise<ServiceRequest | null> {
  if (!isDbConfigured() || !prisma) return null;
  const row = await prisma.serviceRequest.findFirst({
    where: { id, ...ownerWhere(session) },
    include: { client: { select: { name: true } } },
  });
  return row ? mapRow(row) : null;
}

export async function createServiceRequestForSession(
  session: SessionPick,
  input: UpsertServiceRequestInput,
): Promise<ServiceRequest> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  const row = await prisma.serviceRequest.create({
    data: {
      ownerUsername: session.username,
      clientId: input.clientId || null,
      title: String(input.title ?? "").trim(),
      description: String(input.description ?? "").trim(),
      status: input.status ?? "new",
      priority: input.priority ?? "medium",
      dueDate: String(input.dueDate ?? "").trim(),
      createdBy: session.username,
      assignee: String(input.assignee ?? "").trim(),
    },
    include: { client: { select: { name: true } } },
  });
  return mapRow(row);
}

export async function updateServiceRequestForSession(
  id: string,
  session: SessionPick,
  input: UpsertServiceRequestInput,
): Promise<ServiceRequest | null> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  const existing = await prisma.serviceRequest.findFirst({
    where: { id, ...ownerWhere(session) },
    select: { id: true },
  });
  if (!existing) return null;
  const row = await prisma.serviceRequest.update({
    where: { id },
    data: {
      clientId: input.clientId === undefined ? undefined : input.clientId || null,
      title: input.title === undefined ? undefined : String(input.title).trim(),
      description: input.description === undefined ? undefined : String(input.description).trim(),
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate === undefined ? undefined : String(input.dueDate).trim(),
      assignee: input.assignee === undefined ? undefined : String(input.assignee).trim(),
    },
    include: { client: { select: { name: true } } },
  });
  return mapRow(row);
}

export async function deleteServiceRequestForSession(id: string, session: SessionPick): Promise<boolean> {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  const res = await prisma.serviceRequest.deleteMany({ where: { id, ...ownerWhere(session) } });
  return res.count > 0;
}

