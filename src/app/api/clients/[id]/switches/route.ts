import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { createSwitch } from "@/lib/repositories/client-hardware";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) return jsonError("Ime je obvezno.");
    const row = await createSwitch(clientId, {
      name,
      ip: String(body?.ip ?? "").trim(),
      model: String(body?.model ?? "").trim(),
      comment: String(body?.comment ?? "").trim(),
      ports: body?.ports != null ? Number(body.ports) : 0,
    });
    return NextResponse.json({ switch: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
