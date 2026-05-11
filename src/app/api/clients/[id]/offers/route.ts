import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { createEmptyOffer, listClientOffers } from "@/lib/repositories/client-offers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const offers = await listClientOffers(clientId);
    return NextResponse.json({ offers });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function POST(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const offer = await createEmptyOffer(clientId);
    await appendAuditLog(own.session.username, "client_offer_create", `${clientId} → ${offer.id}`);
    return NextResponse.json({ offer }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
