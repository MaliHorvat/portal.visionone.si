import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma, isDbConfigured } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;

    const [edges, events] = await Promise.all([
      prisma.vmsEdgeInstance.findMany({
        where: { clientId },
        orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          externalId: true,
          name: true,
          status: true,
          version: true,
          lastSeenAt: true,
          lastEventAt: true,
          lastError: true,
        },
      }),
      prisma.vmsEvent.findMany({
        where: { clientId },
        orderBy: { startedAt: "desc" },
        take: 25,
        include: {
          camera: { select: { id: true, name: true, ip: true, frigateCameraKey: true } },
          edge: { select: { id: true, externalId: true, name: true, status: true } },
        },
      }),
    ]);

    const latestByCameraId: Record<string, (typeof events)[number]> = {};
    const latestByFrigateKey: Record<string, (typeof events)[number]> = {};
    for (const event of events) {
      if (event.cameraId && !latestByCameraId[event.cameraId]) {
        latestByCameraId[event.cameraId] = event;
      }
      if (event.frigateCameraKey && !latestByFrigateKey[event.frigateCameraKey]) {
        latestByFrigateKey[event.frigateCameraKey] = event;
      }
    }

    return NextResponse.json({ edges, events, latestByCameraId, latestByFrigateKey });
  } catch (e) {
    console.error("[vms] client summary failed:", e);
    return jsonError("Napaka pri branju VMS stanja stranke.", 500);
  }
}

