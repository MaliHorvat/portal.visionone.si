import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { createEmptyOffer, listClientOffers, type OfferLineInput } from "@/lib/repositories/client-offers";
import { getOfferTemplate } from "@/lib/repositories/offer-templates";

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

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const body = await request.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title : undefined;
    const templateId = typeof body?.templateId === "string" ? body.templateId.trim() : "";
    let templateLines: OfferLineInput[] | undefined;
    if (templateId) {
      const tpl = await getOfferTemplate(templateId, own.session.username, own.session.role === "admin");
      if (tpl && Array.isArray(tpl.lines)) {
        templateLines = (tpl.lines as Record<string, unknown>[]).map((l, i) => ({
          section: l.section === "service" ? "service" : "material",
          sortOrder: i,
          code: String(l.code ?? ""),
          description: String(l.description ?? ""),
          unit: String(l.unit ?? "kos"),
          qty: Number(l.qty) || 0,
          unitPrice: Number(l.unitPrice) || 0,
          discountPct: Number(l.discountPct) || 0,
          lineVatPct: Number.isFinite(Number(l.lineVatPct)) ? Number(l.lineVatPct) : 22,
        }));
      }
    }
    const offer = await createEmptyOffer(clientId, { title, templateLines });
    await appendAuditLog(own.session.username, "client_offer_create", `${clientId} → ${offer.id}`);
    return NextResponse.json({ offer }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
