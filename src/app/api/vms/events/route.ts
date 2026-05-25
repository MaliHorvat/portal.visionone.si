import { NextResponse } from "next/server";
import { getPortalSessionPayload, jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma, isDbConfigured } from "@/lib/db";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";

export async function GET(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  try {
    const session = await getPortalSessionPayload();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);

    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId")?.trim() ?? "";
    const provider = url.searchParams.get("provider")?.trim() ?? "";
    const takeRaw = Number(url.searchParams.get("take") ?? 50);
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 100) : 50;

    if (clientId && !(await assertClientOwnedBySession(clientId, session))) {
      return jsonError("Stranka ne obstaja.", 404);
    }

    const events = await prisma.vmsEvent.findMany({
      where: clientId
        ? { clientId, ...(provider ? { provider } : {}) }
        : { client: { ownerUsername: session.username }, ...(provider ? { provider } : {}) },
      orderBy: { startedAt: "desc" },
      take,
      include: {
        client: { select: { id: true, slug: true, name: true } },
        camera: { select: { id: true, name: true, ip: true, frigateCameraKey: true } },
        edge: { select: { id: true, externalId: true, name: true, status: true } },
        agent: { select: { id: true, externalId: true, name: true, lastSeenAt: true } },
      },
    });

    return NextResponse.json({ events });
  } catch (e) {
    console.error("[vms] events failed:", e);
    return jsonError("Napaka pri branju VMS dogodkov.", 500);
  }
}

