import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) {
    return jsonError("DB ni nastavljena.", 500);
  }
  try {
    const agents = await prisma.telemetryAgent.findMany({
      orderBy: { externalId: "asc" },
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ agents });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju agentov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) {
    return jsonError("DB ni nastavljena.", 500);
  }
  try {
    const body = await request.json();
    const externalId = String(body?.externalId ?? "").trim();
    const clientId = String(body?.clientId ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const siteLabel = String(body?.siteLabel ?? "").trim();

    if (!externalId) return jsonError("Polje 'externalId' je obvezno.");
    if (!clientId) return jsonError("Polje 'clientId' je obvezno.");

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return jsonError("Stranka ne obstaja.", 404);

    const agent = await prisma.telemetryAgent.upsert({
      where: { externalId },
      create: {
        externalId,
        name: name || externalId,
        siteLabel: siteLabel || client.name,
        clientId,
      },
      update: {
        name: name || externalId,
        siteLabel: siteLabel || client.name,
        clientId,
      },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ agent });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju agenta.", 500);
  }
}
