import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { createTimeLog, listTimeLogs } from "@/lib/repositories/client-timelogs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!exists) return jsonError("Stranka ne obstaja.", 404);
    const logs = await listTimeLogs(clientId);
    return NextResponse.json({ logs });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!exists) return jsonError("Stranka ne obstaja.", 404);
    const body = await request.json();
    const action = String(body?.action ?? "").trim();
    const technician = String(body?.technician ?? "").trim();
    const hours = Number(body?.hours);
    const hourlyRate = Number(body?.hourlyRate);
    const workDate = String(body?.workDate ?? "").trim();
    const note = body?.note !== undefined ? String(body.note) : "";
    if (!technician) return jsonError("Tehnik je obvezen.");
    if (!workDate) return jsonError("Datum je obvezen.");
    if (Number.isNaN(hourlyRate) || hourlyRate < 0) return jsonError("Neveljavna postavka.");
    if (action === "start") {
      const running = await prisma.clientTimeLog.findFirst({
        where: { clientId, technician, workDate, startedAt: { not: null }, endedAt: null },
        select: { id: true },
      });
      if (running) return jsonError("Časovnik za tega tehnika je že zagnan.", 409);
      const log = await createTimeLog(clientId, {
        workDate,
        technician,
        hours: 0,
        hourlyRate,
        note,
        timeRangeLabel: "",
        startedAt: new Date(),
        endedAt: null,
      });
      return NextResponse.json({ log }, { status: 201 });
    }
    if (Number.isNaN(hours) || hours < 0) return jsonError("Neveljavne ure.");
    const timeRangeLabel =
      body?.timeRangeLabel !== undefined ? String(body.timeRangeLabel).trim().slice(0, 80) : "";
    const log = await createTimeLog(clientId, {
      workDate,
      technician,
      hours,
      hourlyRate,
      note,
      timeRangeLabel,
    });
    return NextResponse.json({ log }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
