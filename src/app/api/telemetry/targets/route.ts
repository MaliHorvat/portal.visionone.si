import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError } from "@/lib/api-guard";
import { requireEspIngestAuth } from "@/lib/esp-ingest-token";

function defaultPort(kind: string): number {
  switch (kind) {
    case "camera":
      return 554;
    case "nvr":
      return 80;
    case "switch":
      return 80;
    default:
      return 80;
  }
}

export async function GET(request: Request) {
  const auth = requireEspIngestAuth(request);
  if (auth) return auth;

  if (!isDbConfigured() || !prisma) {
    return jsonError("DB ni nastavljena.", 500);
  }

  const url = new URL(request.url);
  const agentExternalId = url.searchParams.get("agentId")?.trim() ?? "";
  if (!agentExternalId) {
    return jsonError("Query parameter 'agentId' je obvezen.");
  }

  try {
    const agent = await prisma.telemetryAgent.findUnique({
      where: { externalId: agentExternalId },
    });
    if (!agent) {
      return jsonError("Agent ni registriran v portalu.", 404);
    }
    if (!agent.clientId) {
      return NextResponse.json({
        agentId: agentExternalId,
        clientId: null,
        targets: [],
        warning: "Agent nima dodeljene stranke. V Portalu ga dodeli stranki.",
      });
    }

    const client = await prisma.client.findUnique({
      where: { id: agent.clientId },
      include: { cameras: true, recorders: true, switches: true },
    });
    if (!client) {
      return jsonError("Stranka za agenta ne obstaja.", 404);
    }

    type TargetRow = { key: string; name: string; ip: string; kind: string; port: number };
    const targets: TargetRow[] = [];

    for (const cam of client.cameras) {
      const ip = cam.ip.trim();
      if (!ip) continue;
      const camPort =
        typeof cam.checkPort === "number" && cam.checkPort > 0 && cam.checkPort <= 65535
          ? cam.checkPort
          : defaultPort("camera");
      targets.push({
        key: `cam:${cam.id}`,
        name: cam.name,
        ip,
        kind: "camera",
        port: camPort,
      });
    }
    for (const nvr of client.recorders) {
      const ip = nvr.ip.trim();
      if (!ip) continue;
      targets.push({
        key: `nvr:${nvr.id}`,
        name: nvr.name,
        ip,
        kind: "nvr",
        port: defaultPort("nvr"),
      });
    }
    for (const sw of client.switches) {
      const ip = sw.ip.trim();
      if (!ip) continue;
      targets.push({
        key: `sw:${sw.id}`,
        name: sw.name,
        ip,
        kind: "switch",
        port: defaultPort("switch"),
      });
    }

    return NextResponse.json({
      agentId: agentExternalId,
      clientId: client.id,
      targets,
    });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju tarč.", 500);
  }
}
