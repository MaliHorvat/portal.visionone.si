import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError } from "@/lib/api-guard";
import type { ProbeKind, TelemetryIngestPayload } from "@/lib/types";

const VALID_KINDS: ProbeKind[] = ["camera", "nvr", "switch", "router", "host", "other"];

function parseBearerToken(value: string | null): string {
  if (!value) return "";
  const [type, token] = value.split(" ");
  if (type?.toLowerCase() !== "bearer") return "";
  return token?.trim() ?? "";
}

function toIsoDate(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

export async function POST(request: Request) {
  try {
    if (!isDbConfigured() || !prisma) {
      return jsonError("DB ni nastavljena.", 500);
    }

    const expectedToken = process.env.ESP_INGEST_TOKEN ?? "";
    if (!expectedToken) {
      return jsonError("ESP_INGEST_TOKEN ni nastavljen.", 500);
    }
    const providedToken = parseBearerToken(request.headers.get("authorization"));
    if (!providedToken || providedToken !== expectedToken) {
      return jsonError("Neavtorizirano.", 401);
    }

    const body = (await request.json()) as TelemetryIngestPayload;
    const agentId = String(body?.agentId ?? "").trim();
    const agentName = String(body?.agentName ?? "ESP32 Agent").trim();
    const siteLabel = String(body?.siteLabel ?? "").trim();
    const clientId = body?.clientId ? String(body.clientId).trim() : null;
    const devices = Array.isArray(body?.devices) ? body.devices : [];

    if (!agentId) return jsonError("Polje 'agentId' je obvezno.");
    if (devices.length === 0) return jsonError("Polje 'devices' mora vsebovati vsaj eno napravo.");

    const checkedAt = toIsoDate(body?.checkedAt);

    const agent = await prisma.telemetryAgent.upsert({
      where: { externalId: agentId },
      create: {
        externalId: agentId,
        name: agentName || "ESP32 Agent",
        siteLabel,
        clientId,
        lastSeenAt: checkedAt,
      },
      update: {
        name: agentName || "ESP32 Agent",
        siteLabel,
        clientId,
        lastSeenAt: checkedAt,
      },
    });

    let accepted = 0;
    for (const rawDevice of devices) {
      const key = String(rawDevice?.key ?? "").trim();
      const name = String(rawDevice?.name ?? "").trim();
      const ip = String(rawDevice?.ip ?? "").trim();
      const kind: ProbeKind = VALID_KINDS.includes(rawDevice?.kind) ? rawDevice.kind : "other";
      const reachable = Boolean(rawDevice?.reachable);
      const latencyMs = Number.isFinite(rawDevice?.latencyMs) ? Number(rawDevice.latencyMs) : null;
      const errorText = String(rawDevice?.error ?? "").trim();

      if (!key || !name || !ip) {
        continue;
      }

      const status = reachable ? "online" : "offline";

      const device = await prisma.deviceProbe.upsert({
        where: { agentId_deviceKey: { agentId: agent.id, deviceKey: key } },
        create: {
          agentId: agent.id,
          clientId,
          deviceKey: key,
          name,
          ip,
          kind,
          status,
          latencyMs,
          lastError: errorText,
          lastSeenAt: checkedAt,
        },
        update: {
          agentId: agent.id,
          name,
          ip,
          kind,
          status,
          latencyMs,
          lastError: errorText,
          lastSeenAt: checkedAt,
        },
      });

      await prisma.deviceCheck.create({
        data: {
          agentId: agent.id,
          clientId,
          deviceId: device.id,
          deviceKey: key,
          status,
          latencyMs,
          errorText,
          checkedAt,
        },
      });

      accepted += 1;
    }

    return NextResponse.json({ ok: true, accepted });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri prejemu telemetrije.", 500);
  }
}
