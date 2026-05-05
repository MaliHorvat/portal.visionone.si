import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { deleteRecorder, updateRecorder } from "@/lib/repositories/client-hardware";

type Ctx = { params: Promise<{ id: string; recorderId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, recorderId } = await ctx.params;
    const row = await prisma.clientRecorder.findFirst({ where: { id: recorderId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    const body = await request.json();
    const updated = await updateRecorder(recorderId, {
      name: body?.name !== undefined ? String(body.name) : undefined,
      ip: body?.ip !== undefined ? String(body.ip) : undefined,
      model: body?.model !== undefined ? String(body.model) : undefined,
      comment: body?.comment !== undefined ? String(body.comment) : undefined,
      status: body?.status !== undefined ? String(body.status) : undefined,
      diskTb: body?.diskTb !== undefined ? Number(body.diskTb) : undefined,
    });
    return NextResponse.json({ recorder: updated });
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
    const { id: clientId, recorderId } = await ctx.params;
    const row = await prisma.clientRecorder.findFirst({ where: { id: recorderId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    await deleteRecorder(recorderId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
