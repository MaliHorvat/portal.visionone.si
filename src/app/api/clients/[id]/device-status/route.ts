import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { requireOwnedClient } from "@/lib/guard-client-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const own = await requireOwnedClient(id);
    if (!own.ok) return own.response;
    const probes = await prisma.deviceProbe.findMany({
      where: { clientId: id },
      select: { deviceKey: true, status: true, latencyMs: true, lastSeenAt: true, lastError: true },
    });
    const cameras: Record<string, { status: string }> = {};
    const recorders: Record<string, { status: string }> = {};
    const switches: Record<string, { status: string }> = {};

    for (const p of probes) {
      const cam = /^cam:(.+)$/.exec(p.deviceKey);
      if (cam) {
        cameras[cam[1]] = { status: p.status };
        continue;
      }
      const nvr = /^nvr:(.+)$/.exec(p.deviceKey);
      if (nvr) {
        recorders[nvr[1]] = { status: p.status };
        continue;
      }
      const sw = /^sw:(.+)$/.exec(p.deviceKey);
      if (sw) {
        switches[sw[1]] = { status: p.status };
      }
    }

    return NextResponse.json({ cameras, recorders, switches });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju live statusa naprav.", 500);
  }
}
