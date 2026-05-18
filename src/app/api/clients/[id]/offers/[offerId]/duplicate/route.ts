import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { duplicateOffer, getOffer } from "@/lib/repositories/client-offers";

type Ctx = { params: Promise<{ id: string; offerId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, offerId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const existing = await getOffer(offerId);
    if (!existing || existing.clientId !== clientId) return jsonError("Ponudba ne obstaja.", 404);
    const offer = await duplicateOffer(offerId);
    await appendAuditLog(own.session.username, "client_offer_duplicate", offer.id);
    return NextResponse.json({ offer }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Podvajanje ni uspelo.", 500);
  }
}
