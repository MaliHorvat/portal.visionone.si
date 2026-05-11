import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";

type Ctx = { params: Promise<{ id: string; visitId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, visitId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const exists = await prisma.fieldVisit.findFirst({
      where: { id: visitId, clientId, ownerUsername: own.session.username },
      select: { id: true },
    });
    if (!exists) return jsonError("Obisk ne obstaja.", 404);

    const updated = await prisma.fieldVisit.update({
      where: { id: visitId },
      data: {
        checklist: body.checklist === undefined ? undefined : (body.checklist as object),
        photoProofs: body.photoProofs === undefined ? undefined : (body.photoProofs as object),
        signatureDataUrl: body.signatureDataUrl === undefined ? undefined : String(body.signatureDataUrl ?? ""),
        reportText: body.reportText === undefined ? undefined : String(body.reportText ?? ""),
        checkOutAt: body.checkOutAt ? new Date(String(body.checkOutAt)) : body.checkOutAt === null ? null : undefined,
      },
    });
    return NextResponse.json({ visit: updated });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri posodobitvi obiska.", 500);
  }
}

