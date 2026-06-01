import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError } from "@/lib/api-guard";
import { requireEspIngestAuth } from "@/lib/esp-ingest-token";
import type { ProbeKind, TelemetryIngestPayload } from "@/lib/types";
import { sendTelegramNotification } from "@/lib/telegram-notify";

const VALID_KINDS: ProbeKind[] = ["camera", "nvr", "switch", "router", "host", "other"];

function toIsoDate(value?: string) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

export async function POST(request: Request) {
  try {
    const auth = requireEspIngestAuth(request);
    if (auth) return auth;

    if (!isDbConfigured() || !prisma) {
      return jsonError("DB ni nastavljena.", 500);
    }

    const body = (await request.json()) as TelemetryIngestPayload;
    const agentId = String(body?.agentId ?? "").trim();
    const agentName = String(body?.agentName ?? "VisionOne Agent").trim();
    const siteLabel = String(body?.siteLabel ?? "").trim();
    const devices = Array.isArray(body?.devices) ? body.devices : [];

    if (!agentId) return jsonError("Polje 'agentId' je obvezno.");
    if (devices.length === 0) return jsonError("Polje 'devices' mora vsebovati vsaj eno napravo.");

    const checkedAt = toIsoDate(body?.checkedAt);

    const registered = await prisma.telemetryAgent.findUnique({
      where: { externalId: agentId },
      include: { client: { select: { name: true } } },
    });
    if (!registered) {
      return jsonError(
        "Agent ni registriran. V Portalu pod Agenti dodaj agent_id in ga dodeli stranki.",
        403,
      );
    }
    const clientId = registered.clientId;
    if (!clientId) {
      return jsonError("Agent nima dodeljene stranke v portalu.", 422);
    }

    const agent = await prisma.telemetryAgent.update({
      where: { id: registered.id },
      data: {
        lastSeenAt: checkedAt,
        name: agentName || registered.name,
        siteLabel: siteLabel || registered.siteLabel,
        lastError: "",
      },
    });

    let accepted = 0;
    for (const rawDevice of devices) {
      const key = String(rawDevice?.key ?? "").trim();
      const name = String(rawDevice?.name ?? "").trim();
      const ip = String(rawDevice?.ip ?? "").trim();
      const kind: ProbeKind = VALID_KINDS.includes(rawDevice?.kind) ? rawDevice.kind : "other";
      const reachable =
        rawDevice?.reachable !== undefined
          ? Boolean(rawDevice.reachable)
          : String(rawDevice?.status ?? "").toLowerCase() === "online";
      const latencyMs = Number.isFinite(rawDevice?.latencyMs) ? Number(rawDevice.latencyMs) : null;
      const errorText = String(rawDevice?.error ?? "").trim();

      if (!key || !name || !ip) {
        continue;
      }

      const status = reachable ? "online" : "offline";
      const previous = await prisma.deviceProbe.findUnique({
        where: { agentId_deviceKey: { agentId: agent.id, deviceKey: key } },
        select: { status: true },
      });

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
      if (status === "offline" && previous?.status !== "offline") {
        void sendTelegramNotification(
          `🚨 Naprava offline\nStranka: ${registered.client?.name || "-"}\nNaprava: ${name}\nIP: ${ip}\nAgent: ${agentId}`,
          "device_offline",
        );
      }

      accepted += 1;
    }

    return NextResponse.json({ ok: true, accepted });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri prejemu telemetrije.", 500);
  }
}
