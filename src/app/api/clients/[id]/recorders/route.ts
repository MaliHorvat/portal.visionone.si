import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { createRecorder } from "@/lib/repositories/client-hardware";

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
    const name = String(body?.name ?? "").trim();
    if (!name) return jsonError("Ime je obvezno.");
    const row = await createRecorder(clientId, {
      name,
      ip: String(body?.ip ?? "").trim(),
      model: String(body?.model ?? "").trim(),
      comment: String(body?.comment ?? "").trim(),
      diskTb: body?.diskTb != null ? Number(body.diskTb) : 0,
    });
    return NextResponse.json({ recorder: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
