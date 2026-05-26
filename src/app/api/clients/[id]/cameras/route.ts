import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { createCamera } from "@/lib/repositories/client-hardware";

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
    if (!name) return jsonError("Ime kamere je obvezno.");
    const row = await createCamera(clientId, {
      tag: String(body?.tag ?? "").trim(),
      name,
      ip: String(body?.ip ?? "").trim(),
      rtspUser: String(body?.rtspUser ?? "").trim(),
      rtspPass: String(body?.rtspPass ?? "").trim(),
      model: String(body?.model ?? "").trim(),
      comment: String(body?.comment ?? "").trim(),
      checkPort: body?.checkPort != null ? Number(body.checkPort) : null,
      streamUrl: String(body?.streamUrl ?? "").trim(),
    });
    return NextResponse.json({ camera: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri dodajanju kamere.", 500);
  }
}
