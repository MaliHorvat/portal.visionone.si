import { NextResponse } from "next/server";
import { getPortalSessionPayload, jsonError, requirePortalRole } from "@/lib/api-guard";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";
import { createRpiAgentBundleForClient } from "@/lib/rpi-agent-bundle";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;

  try {
    const session = await getPortalSessionPayload();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);

    const { id: clientId } = await ctx.params;
    if (!(await assertClientOwnedBySession(clientId, session))) {
      return jsonError("Stranka ne obstaja.", 404);
    }

    const portalBase =
      process.env.NEXT_PUBLIC_PORTAL_BASE_URL?.trim() ||
      new URL(request.url).origin;

    const { zip, meta, filename } = await createRpiAgentBundleForClient(
      clientId,
      session.username,
      portalBase,
    );

    return new NextResponse(Buffer.from(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-VisionOne-Agent-Id": meta.agentId,
        "X-VisionOne-Claim-Code": meta.claimCode,
      },
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Napaka pri generiranju paketa.";
    return jsonError(msg, 500);
  }
}
