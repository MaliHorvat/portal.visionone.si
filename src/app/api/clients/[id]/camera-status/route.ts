import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const probes = await prisma.deviceProbe.findMany({
      where: { clientId: id, kind: "camera" },
      select: {
        deviceKey: true,
        status: true,
        lastSeenAt: true,
        latencyMs: true,
        lastError: true,
      },
    });
    const statusByCameraId = Object.fromEntries(
      probes
        .map((p) => {
          const m = /^cam:(.+)$/.exec(p.deviceKey);
          if (!m) return null;
          return [
            m[1],
            {
              status: p.status,
              lastSeenAt: p.lastSeenAt,
              latencyMs: p.latencyMs,
              lastError: p.lastError,
            },
          ] as const;
        })
        .filter(Boolean) as Array<
        readonly [
          string,
          { status: string; lastSeenAt: Date | null; latencyMs: number | null; lastError: string },
        ]
      >,
    );
    return NextResponse.json({ statusByCameraId });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju telemetry statusa.", 500);
  }
}
