import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { createDisk } from "@/lib/repositories/client-hardware";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const exists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!exists) return jsonError("Stranka ne obstaja.", 404);
    const body = await request.json();
    const label = String(body?.label ?? "").trim();
    if (!label) return jsonError("Ime diska je obvezno.");
    const row = await createDisk(clientId, {
      label,
      ip: String(body?.ip ?? "").trim(),
      model: String(body?.model ?? "").trim(),
      serial: String(body?.serial ?? "").trim(),
      sizeTb: body?.sizeTb != null ? Number(body.sizeTb) : 0,
      installedAt: String(body?.installedAt ?? "").trim(),
      comment: String(body?.comment ?? "").trim(),
      health: body?.health !== undefined ? String(body.health) : "ok",
    });
    return NextResponse.json({ disk: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
