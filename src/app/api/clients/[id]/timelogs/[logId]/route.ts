import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { deleteTimeLog, stopTimeLog, updateTimeLog } from "@/lib/repositories/client-timelogs";

type Ctx = { params: Promise<{ id: string; logId: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, logId } = await ctx.params;
    const row = await prisma.clientTimeLog.findFirst({ where: { id: logId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    await deleteTimeLog(logId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, logId } = await ctx.params;
    const row = await prisma.clientTimeLog.findFirst({ where: { id: logId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim();
    if (action === "stop") {
      const stopped = await stopTimeLog(logId);
      return NextResponse.json({ log: stopped });
    }
    const patch: { note?: string; hourlyRate?: number; workDate?: string; technician?: string } = {};
    if (body?.note !== undefined) patch.note = String(body.note);
    if (body?.hourlyRate !== undefined) {
      const rate = Number(body.hourlyRate);
      if (Number.isNaN(rate) || rate < 0) return jsonError("Neveljavna postavka.");
      patch.hourlyRate = rate;
    }
    if (body?.workDate !== undefined) patch.workDate = String(body.workDate);
    if (body?.technician !== undefined) patch.technician = String(body.technician);
    const updated = await updateTimeLog(logId, patch);
    return NextResponse.json({ log: updated });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
