import type { Prisma } from "@prisma/client";
import { prisma, isDbConfigured } from "@/lib/db";

type RawVmsEvent = {
  id?: unknown;
  eventId?: unknown;
  frigateEventId?: unknown;
  camera?: unknown;
  cameraKey?: unknown;
  frigateCameraKey?: unknown;
  kerberosCameraKey?: unknown;
  cameraId?: unknown;
  type?: unknown;
  eventType?: unknown;
  label?: unknown;
  score?: unknown;
  zone?: unknown;
  severity?: unknown;
  startTime?: unknown;
  startedAt?: unknown;
  endTime?: unknown;
  endedAt?: unknown;
  snapshotUrl?: unknown;
  clipUrl?: unknown;
  data?: unknown;
};

export type VmsIngestPayload = {
  provider?: unknown;
  agentId?: unknown;
  agentName?: unknown;
  siteLabel?: unknown;
  checkedAt?: unknown;
  edge?: {
    provider?: unknown;
    externalId?: unknown;
    name?: unknown;
    frigateUrl?: unknown;
    kerberosUrl?: unknown;
    status?: unknown;
    version?: unknown;
    storagePath?: unknown;
    lastError?: unknown;
  };
  events?: RawVmsEvent[];
};

function asString(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asDate(value: unknown, fallback = new Date()) {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? fallback : date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

async function resolveCamera(clientId: string, raw: RawVmsEvent) {
  if (!prisma) return null;
  const cameraId = asString(raw.cameraId);
  const frigateCameraKey = asString(raw.frigateCameraKey ?? raw.cameraKey ?? raw.camera);
  const kerberosCameraKey = asString(raw.kerberosCameraKey ?? raw.cameraKey ?? raw.camera);
  if (!cameraId && !frigateCameraKey) return null;
  return prisma.clientCamera.findFirst({
    where: {
      clientId,
      OR: [
        ...(cameraId ? [{ id: cameraId }] : []),
        ...(frigateCameraKey ? [{ frigateCameraKey }, { kerberosCameraKey }, { name: frigateCameraKey }] : []),
      ],
    },
    select: { id: true },
  });
}

export async function ingestVmsPayload(payload: VmsIngestPayload) {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");

  const externalAgentId = asString(payload.agentId);
  if (!externalAgentId) throw new Error("Polje 'agentId' je obvezno.");

  const registered = await prisma.telemetryAgent.findUnique({
    where: { externalId: externalAgentId },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!registered) throw new Error("Agent ni registriran.");
  if (!registered.clientId) throw new Error("Agent nima dodeljene stranke.");

  const checkedAt = asDate(payload.checkedAt);
  const agentName = asString(payload.agentName, registered.name);
  const siteLabel = asString(payload.siteLabel, registered.siteLabel);
  const provider = asString(payload.provider ?? payload.edge?.provider, "frigate") || "frigate";

  const agent = await prisma.telemetryAgent.update({
    where: { id: registered.id },
    data: {
      name: agentName || registered.name,
      siteLabel: siteLabel || registered.siteLabel,
      lastSeenAt: checkedAt,
      lastError: "",
    },
  });

  const edgeExternalId = asString(payload.edge?.externalId, externalAgentId);
  const edge = await prisma.vmsEdgeInstance.upsert({
    where: { clientId_externalId: { clientId: registered.clientId, externalId: edgeExternalId } },
    create: {
      clientId: registered.clientId,
      agentId: agent.id,
      provider,
      externalId: edgeExternalId,
      name: asString(payload.edge?.name, provider === "kerberos" ? "Kerberos Agent" : "Frigate Edge"),
      siteLabel,
      frigateUrl: asString(payload.edge?.frigateUrl ?? payload.edge?.kerberosUrl),
      status: asString(payload.edge?.status, "online") || "online",
      version: asString(payload.edge?.version),
      storagePath: asString(payload.edge?.storagePath),
      lastError: asString(payload.edge?.lastError),
      lastSeenAt: checkedAt,
    },
    update: {
      agentId: agent.id,
      provider,
      name: asString(payload.edge?.name, provider === "kerberos" ? "Kerberos Agent" : "Frigate Edge"),
      siteLabel,
      frigateUrl: asString(payload.edge?.frigateUrl ?? payload.edge?.kerberosUrl),
      status: asString(payload.edge?.status, "online") || "online",
      version: asString(payload.edge?.version),
      storagePath: asString(payload.edge?.storagePath),
      lastError: asString(payload.edge?.lastError),
      lastSeenAt: checkedAt,
    },
  });

  let accepted = 0;
  const events = Array.isArray(payload.events) ? payload.events : [];
  for (const raw of events) {
    const frigateEventId = asString(raw.frigateEventId ?? raw.eventId ?? raw.id);
    const frigateCameraKey = asString(raw.frigateCameraKey ?? raw.cameraKey ?? raw.camera);
    if (!frigateEventId || !frigateCameraKey) continue;

    const startedAt = asDate(raw.startedAt ?? raw.startTime, checkedAt);
    const endedAtRaw = raw.endedAt ?? raw.endTime;
    const camera = await resolveCamera(registered.clientId, raw);
    const score = asNumber(raw.score);
    const data = toJson(raw.data ?? raw);

    await prisma.vmsEvent.upsert({
      where: { clientId_frigateEventId: { clientId: registered.clientId, frigateEventId } },
      create: {
        clientId: registered.clientId,
        agentId: agent.id,
        edgeId: edge.id,
        cameraId: camera?.id ?? null,
        provider,
        frigateEventId,
        frigateCameraKey,
        eventType: asString(raw.eventType ?? raw.type, "object") || "object",
        label: asString(raw.label),
        score,
        zone: asString(raw.zone),
        severity: asString(raw.severity, "info") || "info",
        startedAt,
        endedAt: endedAtRaw == null ? null : asDate(endedAtRaw, startedAt),
        snapshotUrl: asString(raw.snapshotUrl),
        clipUrl: asString(raw.clipUrl),
        data,
      },
      update: {
        agentId: agent.id,
        edgeId: edge.id,
        cameraId: camera?.id ?? undefined,
        provider,
        frigateCameraKey,
        eventType: asString(raw.eventType ?? raw.type, "object") || "object",
        label: asString(raw.label),
        score,
        zone: asString(raw.zone),
        severity: asString(raw.severity, "info") || "info",
        startedAt,
        endedAt: endedAtRaw == null ? undefined : asDate(endedAtRaw, startedAt),
        snapshotUrl: asString(raw.snapshotUrl),
        clipUrl: asString(raw.clipUrl),
        data,
      },
    });
    accepted += 1;
  }

  if (accepted > 0) {
    await prisma.vmsEdgeInstance.update({
      where: { id: edge.id },
      data: { lastEventAt: checkedAt },
    });
  }

  return { accepted, edgeId: edge.id, clientId: registered.clientId };
}

