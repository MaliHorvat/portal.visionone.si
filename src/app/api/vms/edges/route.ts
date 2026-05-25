import { NextResponse } from "next/server";
import { getPortalSessionPayload, jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma, isDbConfigured } from "@/lib/db";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  try {
    const session = await getPortalSessionPayload();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);

    const edges = await prisma.vmsEdgeInstance.findMany({
      where: { client: { ownerUsername: session.username } },
      orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
      include: {
        client: { select: { id: true, slug: true, name: true } },
        agent: { select: { id: true, externalId: true, name: true, lastSeenAt: true } },
      },
    });

    return NextResponse.json({ edges });
  } catch (e) {
    console.error("[vms] edges failed:", e);
    return jsonError("Napaka pri branju VMS edge instanc.", 500);
  }
}

