import { NextResponse } from "next/server";
import { getPortalSessionPayload, jsonError, requirePortalRole } from "@/lib/api-guard";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";
import {
  getClientCareBoxStatus,
  updateClientCareBoxSettings,
} from "@/lib/repositories/care-box";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;

  try {
    const session = await getPortalSessionPayload();
    const { id: clientId } = await ctx.params;
    if (!(await assertClientOwnedBySession(clientId, session!))) {
      return jsonError("Stranka ne obstaja.", 404);
    }
    const status = await getClientCareBoxStatus(clientId, session ?? undefined);
    if (!status) return jsonError("Stranka ne obstaja.", 404);
    return NextResponse.json(status);
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju Care Box statusa.", 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;

  try {
    const session = await getPortalSessionPayload();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const { id: clientId } = await ctx.params;
    if (!(await assertClientOwnedBySession(clientId, session))) {
      return jsonError("Stranka ne obstaja.", 404);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const careSlaTier = body.careSlaTier !== undefined ? String(body.careSlaTier) : undefined;
    if (careSlaTier !== undefined && !["", "standard", "priority", "critical"].includes(careSlaTier)) {
      return jsonError("Neveljaven SLA nivo.", 400);
    }

    await updateClientCareBoxSettings(
      clientId,
      {
        ...(body.careBoxEnabled !== undefined ? { careBoxEnabled: Boolean(body.careBoxEnabled) } : {}),
        ...(careSlaTier !== undefined ? { careSlaTier } : {}),
        ...(body.careRemoteNotes !== undefined ? { careRemoteNotes: String(body.careRemoteNotes) } : {}),
      },
      session,
    );

    const status = await getClientCareBoxStatus(clientId, session);
    return NextResponse.json(status);
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju.", 500);
  }
}
