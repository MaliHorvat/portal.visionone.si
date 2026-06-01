import { prisma, isDbConfigured } from "@/lib/db";
import { isAgentOnline } from "@/lib/care-box";
import { listClientsForSession } from "@/lib/repositories/clients";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";

export type MojDeviceStatus = {
  name: string;
  kind: string;
  status: "online" | "offline";
  lastSeenAt: string | null;
};

export type MojSystemStatus = {
  active: boolean;
  agentOnline: boolean;
  lastCheckAt: string | null;
  summary: { total: number; online: number; offline: number };
  devices: MojDeviceStatus[];
  message: string;
};

const KIND_LABEL: Record<string, string> = {
  camera: "Kamera",
  nvr: "Snemalnik",
  switch: "Stikalo",
  router: "Usmerjevalnik",
  host: "Agent",
  other: "Naprava",
};

export function deviceKindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? "Naprava";
}

export async function getMojSystemStatus(
  session?: PortalSessionPayload,
): Promise<MojSystemStatus> {
  const empty: MojSystemStatus = {
    active: false,
    agentOnline: false,
    lastCheckAt: null,
    summary: { total: 0, online: 0, offline: 0 },
    devices: [],
    message: "Monitoring še ni aktiven — kontaktirajte VisionOne.",
  };

  const clients = await listClientsForSession(session);
  const client = clients[0];
  if (!client) return empty;

  if (!isDbConfigured() || !prisma) {
    return {
      ...empty,
      message: "Demo način — podatki monitoringa niso na voljo.",
    };
  }

  const probes = await prisma.deviceProbe.findMany({
    where: { clientId: client.id },
    orderBy: { name: "asc" },
  });

  const agents = await prisma.telemetryAgent.findMany({
    where: { clientId: client.id },
    select: { lastSeenAt: true },
  });

  const agentOnline = agents.some((a) => isAgentOnline(a.lastSeenAt));
  const lastCheckAt = probes.reduce<string | null>((best, p) => {
    if (!p.lastSeenAt) return best;
    const iso = p.lastSeenAt.toISOString();
    return !best || iso > best ? iso : best;
  }, null);

  if (probes.length === 0) {
    return {
      ...empty,
      agentOnline,
      message: client.careBoxEnabled
        ? "Care Box je vključen — čakamo prvi prenos iz Raspberry Pi."
        : "Monitoring še ni nastavljen — VisionOne vas obvesti ob aktivaciji.",
    };
  }

  const devices: MojDeviceStatus[] = probes.map((p) => ({
    name: p.name,
    kind: deviceKindLabel(p.kind),
    status: p.status === "online" ? "online" : "offline",
    lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
  }));

  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.length - online;

  let message = "Vse ključne naprave so dosegljive.";
  if (offline > 0) {
    message =
      offline === 1
        ? "Ena naprava trenutno ni dosegljiva — VisionOne je obveščen."
        : `${offline} naprav trenutno ni dosegljivih — VisionOne je obveščen.`;
  }
  if (!agentOnline) {
    message = "Monitoring na objektu trenutno ne pošilja podatkov — preverjamo vzrok.";
  }

  return {
    active: true,
    agentOnline,
    lastCheckAt,
    summary: { total: devices.length, online, offline },
    devices,
    message,
  };
}
