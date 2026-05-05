import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { deleteDisk, updateDisk } from "@/lib/repositories/client-hardware";

type Ctx = { params: Promise<{ id: string; diskId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, diskId } = await ctx.params;
    const row = await prisma.clientDisk.findFirst({ where: { id: diskId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    const body = await request.json();
    const updated = await updateDisk(diskId, {
      label: body?.label !== undefined ? String(body.label) : undefined,
      ip: body?.ip !== undefined ? String(body.ip) : undefined,
      model: body?.model !== undefined ? String(body.model) : undefined,
      serial: body?.serial !== undefined ? String(body.serial) : undefined,
      sizeTb: body?.sizeTb !== undefined ? Number(body.sizeTb) : undefined,
      installedAt: body?.installedAt !== undefined ? String(body.installedAt) : undefined,
      comment: body?.comment !== undefined ? String(body.comment) : undefined,
      health: body?.health !== undefined ? String(body.health) : undefined,
    });
    return NextResponse.json({ disk: updated });
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
    const { id: clientId, diskId } = await ctx.params;
    const row = await prisma.clientDisk.findFirst({ where: { id: diskId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    await deleteDisk(diskId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
