import { prisma, isDbConfigured } from "@/lib/db";
import { careSlaLabel, isAgentOnline, isCareBoxAgent } from "@/lib/care-box";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";

export type CareBoxDeviceDto = {
  id: string;
  name: string;
  ip: string;
  kind: string;
  status: string;
  latencyMs: number | null;
  lastSeenAt: string | null;
};

export type CareBoxAgentDto = {
  id: string;
  externalId: string;
  name: string;
  siteLabel: string;
  agentKind: string;
  online: boolean;
  lastSeenAt: string | null;
  lastError: string;
  configVersion: number;
  devices: CareBoxDeviceDto[];
  pendingClaims: { code: string; expiresAt: string }[];
};

export type ClientCareBoxStatusDto = {
  clientId: string;
  clientName: string;
  careBoxEnabled: boolean;
  careSlaTier: string;
  careSlaLabel: string;
  careRemoteNotes: string;
  agents: CareBoxAgentDto[];
  summary: {
    online: boolean;
    devicesTotal: number;
    devicesOffline: number;
    devicesAlarm: number;
  };
};

export type CareBoxOverviewRowDto = {
  clientId: string;
  clientName: string;
  clientSlug: string | null;
  careSlaTier: string;
  careSlaLabel: string;
  agentId: string | null;
  agentExternalId: string | null;
  online: boolean;
  lastSeenAt: string | null;
  devicesTotal: number;
  devicesOffline: number;
  lastError: string;
};

function ownerWhere(session?: PortalSessionPayload) {
  const owner = session?.username?.trim();
  return owner ? { ownerUsername: owner } : { ownerUsername: "__portal_no_owner__" };
}

export async function getClientCareBoxStatus(
  clientId: string,
  session?: PortalSessionPayload,
): Promise<ClientCareBoxStatusDto | null> {
  if (!isDbConfigured() || !prisma) return null;

  const client = await prisma.client.findFirst({
    where: { id: clientId, ...ownerWhere(session) },
    select: {
      id: true,
      name: true,
      careBoxEnabled: true,
      careSlaTier: true,
      careRemoteNotes: true,
      telemetryAgents: {
        where: { OR: [{ agentKind: "care_box" }, { externalId: { startsWith: "care-" } }] },
        include: {
          devices: { orderBy: { name: "asc" } },
          claims: {
            where: { consumedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy: { externalId: "asc" },
      },
    },
  });
  if (!client) return null;

  const agents: CareBoxAgentDto[] = client.telemetryAgents.map((a) => {
    const online = isAgentOnline(a.lastSeenAt);
    const devices = a.devices.map((d) => ({
      id: d.id,
      name: d.name,
      ip: d.ip,
      kind: d.kind,
      status: d.status,
      latencyMs: d.latencyMs,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    }));
    return {
      id: a.id,
      externalId: a.externalId,
      name: a.name,
      siteLabel: a.siteLabel,
      agentKind: a.agentKind,
      online,
      lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
      lastError: a.lastError,
      configVersion: a.configVersion,
      devices,
      pendingClaims: a.claims.map((c) => ({
        code: c.code,
        expiresAt: c.expiresAt.toISOString(),
      })),
    };
  });

  let devicesTotal = 0;
  let devicesOffline = 0;
  let devicesAlarm = 0;
  for (const a of agents) {
    for (const d of a.devices) {
      devicesTotal += 1;
      if (d.status === "offline") devicesOffline += 1;
      if (d.status === "alarm") devicesAlarm += 1;
    }
  }

  return {
    clientId: client.id,
    clientName: client.name,
    careBoxEnabled: client.careBoxEnabled,
    careSlaTier: client.careSlaTier,
    careSlaLabel: careSlaLabel(client.careSlaTier),
    careRemoteNotes: client.careRemoteNotes,
    agents,
    summary: {
      online: agents.some((a) => a.online),
      devicesTotal,
      devicesOffline,
      devicesAlarm,
    },
  };
}

export async function updateClientCareBoxSettings(
  clientId: string,
  data: {
    careBoxEnabled?: boolean;
    careSlaTier?: string;
    careRemoteNotes?: string;
  },
  session?: PortalSessionPayload,
) {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
  const existing = await prisma.client.findFirst({
    where: { id: clientId, ...ownerWhere(session) },
    select: { id: true },
  });
  if (!existing) throw new Error("Stranka ne obstaja.");

  return prisma.client.update({
    where: { id: clientId },
    data: {
      ...(data.careBoxEnabled !== undefined ? { careBoxEnabled: data.careBoxEnabled } : {}),
      ...(data.careSlaTier !== undefined ? { careSlaTier: data.careSlaTier } : {}),
      ...(data.careRemoteNotes !== undefined ? { careRemoteNotes: data.careRemoteNotes } : {}),
    },
  });
}

export async function listCareBoxOverview(session?: PortalSessionPayload): Promise<CareBoxOverviewRowDto[]> {
  if (!isDbConfigured() || !prisma) return [];

  const clients = await prisma.client.findMany({
    where: {
      ...ownerWhere(session),
      OR: [
        { careBoxEnabled: true },
        { telemetryAgents: { some: { OR: [{ agentKind: "care_box" }, { externalId: { startsWith: "care-" } }] } } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      careSlaTier: true,
      telemetryAgents: {
        where: { OR: [{ agentKind: "care_box" }, { externalId: { startsWith: "care-" } }] },
        include: { devices: { select: { status: true } } },
        orderBy: { lastSeenAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ careBoxEnabled: "desc" }, { name: "asc" }],
  });

  return clients.map((c) => {
    const agent = c.telemetryAgents[0] ?? null;
    const devicesTotal = agent?.devices.length ?? 0;
    const devicesOffline = agent?.devices.filter((d) => d.status === "offline" || d.status === "alarm").length ?? 0;
    const online = agent ? isAgentOnline(agent.lastSeenAt) : false;
    return {
      clientId: c.id,
      clientName: c.name,
      clientSlug: c.slug,
      careSlaTier: c.careSlaTier,
      careSlaLabel: careSlaLabel(c.careSlaTier),
      agentId: agent?.id ?? null,
      agentExternalId: agent?.externalId ?? null,
      online,
      lastSeenAt: agent?.lastSeenAt?.toISOString() ?? null,
      devicesTotal,
      devicesOffline,
      lastError: agent?.lastError ?? "",
    };
  });
}

export async function getCareBoxDashboardCounts(session?: PortalSessionPayload) {
  const rows = await listCareBoxOverview(session);
  const total = rows.length;
  const offline = rows.filter((r) => !r.online).length;
  const deviceIssues = rows.filter((r) => r.devicesOffline > 0).length;
  return { total, offline, deviceIssues };
}

/** Označi legacy agente kot care box po konvenciji imena. */
export function normalizeAgentKind(externalId: string, agentKind: string) {
  if (isCareBoxAgent(externalId, agentKind)) return "care_box";
  return agentKind || "standard";
}
