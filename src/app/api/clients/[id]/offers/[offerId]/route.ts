import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { deleteOffer, getOffer, updateOfferFull, type OfferLineInput } from "@/lib/repositories/client-offers";

type Ctx = { params: Promise<{ id: string; offerId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, offerId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const offer = await getOffer(offerId);
    if (!offer || offer.clientId !== clientId) return jsonError("Ponudba ne obstaja.", 404);
    return NextResponse.json({ offer });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, offerId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const existing = await getOffer(offerId);
    if (!existing || existing.clientId !== clientId) return jsonError("Ponudba ne obstaja.", 404);

    const body = await request.json();
    const rawLines = Array.isArray(body?.lines) ? body.lines : [];
    const lines: OfferLineInput[] = rawLines.map((l: Record<string, unknown>, i: number) => ({
      section: l.section === "service" ? "service" : "material",
      sortOrder: typeof l.sortOrder === "number" ? l.sortOrder : i,
      code: String(l.code ?? ""),
      description: String(l.description ?? ""),
      unit: String(l.unit ?? "kos"),
      qty: Number(l.qty) || 0,
      unitPrice: Number(l.unitPrice) || 0,
      discountPct: Number(l.discountPct) || 0,
      lineVatPct: Number.isFinite(Number(l.lineVatPct)) ? Number(l.lineVatPct) : 22,
    }));

    const VALID_STATUS = new Set(["draft", "sent", "accepted", "rejected"]);
    const st = body?.offerStatus !== undefined ? String(body.offerStatus) : undefined;
    const offerStatus = st && VALID_STATUS.has(st) ? st : undefined;

    const offer = await updateOfferFull(offerId, {
      title: body?.title !== undefined ? String(body.title) : undefined,
      offerDate: body?.offerDate !== undefined ? String(body.offerDate) : undefined,
      clientAddress: body?.clientAddress !== undefined ? String(body.clientAddress) : undefined,
      notes: body?.notes !== undefined ? String(body.notes) : undefined,
      totalDiscountPct:
        body?.totalDiscountPct !== undefined ? Number(body.totalDiscountPct) : undefined,
      vatEnabled: body?.vatEnabled !== undefined ? Boolean(body.vatEnabled) : undefined,
      vatPct: body?.vatPct !== undefined ? Number(body.vatPct) : undefined,
      offerStatus,
      offerNumber: body?.offerNumber !== undefined ? String(body.offerNumber) : undefined,
      lines,
    });
    await appendAuditLog(own.session.username, "client_offer_save", offerId);
    return NextResponse.json({ offer });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, offerId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const existing = await getOffer(offerId);
    if (!existing || existing.clientId !== clientId) return jsonError("Ponudba ne obstaja.", 404);
    await deleteOffer(offerId);
    await appendAuditLog(own.session.username, "client_offer_delete", offerId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
