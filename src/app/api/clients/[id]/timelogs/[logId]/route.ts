import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { deleteTimeLog } from "@/lib/repositories/client-timelogs";

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
