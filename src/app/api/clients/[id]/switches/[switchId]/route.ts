import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { deleteSwitch, updateSwitch } from "@/lib/repositories/client-hardware";

type Ctx = { params: Promise<{ id: string; switchId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, switchId } = await ctx.params;
    const row = await prisma.clientSwitch.findFirst({ where: { id: switchId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    const body = await request.json();
    const updated = await updateSwitch(switchId, {
      name: body?.name !== undefined ? String(body.name) : undefined,
      ip: body?.ip !== undefined ? String(body.ip) : undefined,
      model: body?.model !== undefined ? String(body.model) : undefined,
      comment: body?.comment !== undefined ? String(body.comment) : undefined,
      status: body?.status !== undefined ? String(body.status) : undefined,
      ports: body?.ports !== undefined ? Number(body.ports) : undefined,
    });
    return NextResponse.json({ switch: updated });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, switchId } = await ctx.params;
    const row = await prisma.clientSwitch.findFirst({ where: { id: switchId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    await deleteSwitch(switchId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
