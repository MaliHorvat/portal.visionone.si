import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { deleteClient, getClient, updateClient } from "@/lib/repositories/clients";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const client = await getClient(id);
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
    const { id } = await ctx.params;
    const body = await request.json();
    const updated = await updateClient(id, {
      name: body?.name,
      address: body?.address,
      contact: body?.contact,
      email: body?.email,
      health: body?.health === "alarm" ? "alarm" : body?.health === "ok" ? "ok" : undefined,
      packageId: body?.packageId === undefined ? undefined : body.packageId,
    });
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
    const { id } = await ctx.params;
    await deleteClient(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju stranke.", 500);
  }
}
