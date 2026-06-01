import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { deleteClient, getClientForSession, updateClient } from "@/lib/repositories/clients";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const { id } = await ctx.params;
    const client = await getClientForSession(id, session ?? undefined);
    if (!client) return jsonError("Stranka ne obstaja.", 404);
    return NextResponse.json({ client });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju stranke.", 500);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const { id } = await ctx.params;
    const allowed = await getClientForSession(id, session ?? undefined);
    if (!allowed) return jsonError("Stranka ne obstaja.", 404);
    const body = await request.json();
    const tagsRaw = body?.tags;
    const tags = Array.isArray(tagsRaw)
      ? tagsRaw.filter((x: unknown): x is string => typeof x === "string").map((t) => t.trim()).filter(Boolean)
      : undefined;
    const preventiveRaw = body?.preventive;
    const preventive =
      preventiveRaw && typeof preventiveRaw === "object"
        ? {
            diskReplaceDueDate:
              preventiveRaw.diskReplaceDueDate !== undefined
                ? String(preventiveRaw.diskReplaceDueDate ?? "")
                : undefined,
            diskReplaceNote:
              preventiveRaw.diskReplaceNote !== undefined
                ? String(preventiveRaw.diskReplaceNote ?? "")
                : undefined,
            preventiveInspectionDueDate:
              preventiveRaw.preventiveInspectionDueDate !== undefined
                ? String(preventiveRaw.preventiveInspectionDueDate ?? "")
                : undefined,
            preventiveInspectionNote:
              preventiveRaw.preventiveInspectionNote !== undefined
                ? String(preventiveRaw.preventiveInspectionNote ?? "")
                : undefined,
            extraItems: Array.isArray(preventiveRaw.extraItems) ? preventiveRaw.extraItems : undefined,
          }
        : undefined;

    const updated = await updateClient(
      id,
      {
        name: body?.name,
        address: body?.address,
        contact: body?.contact,
        phone: body?.phone,
        email: body?.email,
        health: body?.health === "alarm" ? "alarm" : body?.health === "ok" ? "ok" : undefined,
        packageId: body?.packageId === undefined ? undefined : body.packageId,
        mojPortalEnabled:
          body?.mojPortalEnabled === undefined ? undefined : Boolean(body.mojPortalEnabled),
        topologyData: body?.topologyData,
        rackData: body?.rackData,
        tags,
        preventive,
      },
      session?.username ?? "",
    );
    return NextResponse.json({ client: updated });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri urejanju stranke.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const { id } = await ctx.params;
    const allowed = await getClientForSession(id, session ?? undefined);
    if (!allowed) return jsonError("Stranka ne obstaja.", 404);
    await deleteClient(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju stranke.", 500);
  }
}
