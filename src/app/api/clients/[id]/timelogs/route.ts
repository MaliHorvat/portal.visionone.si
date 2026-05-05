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
    const technician = String(body?.technician ?? "").trim();
    const hours = Number(body?.hours);
    const hourlyRate = Number(body?.hourlyRate);
    const workDate = String(body?.workDate ?? "").trim();
    if (!technician) return jsonError("Tehnik je obvezen.");
    if (!workDate) return jsonError("Datum je obvezen.");
    if (Number.isNaN(hours) || hours < 0) return jsonError("Neveljavne ure.");
    if (Number.isNaN(hourlyRate) || hourlyRate < 0) return jsonError("Neveljavna postavka.");
    const log = await createTimeLog(clientId, { workDate, technician, hours, hourlyRate });
    return NextResponse.json({ log }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
