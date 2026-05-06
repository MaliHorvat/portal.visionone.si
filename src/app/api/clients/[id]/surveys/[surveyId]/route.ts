import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { deleteSiteSurvey, updateSiteSurvey } from "@/lib/repositories/client-surveys";

type Ctx = { params: Promise<{ id: string; surveyId: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, surveyId } = await ctx.params;
    const row = await prisma.clientSiteSurvey.findFirst({ where: { id: surveyId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    const body = await request.json();
    const survey = await updateSiteSurvey(surveyId, {
      surveyDate: body?.surveyDate !== undefined ? String(body.surveyDate) : undefined,
      objectType: body?.objectType !== undefined ? String(body.objectType) : undefined,
      address: body?.address !== undefined ? String(body.address) : undefined,
      ceilingHeight: body?.ceilingHeight !== undefined ? String(body.ceilingHeight) : undefined,
      cabling: body?.cabling !== undefined ? String(body.cabling) : undefined,
      powerSupply: body?.powerSupply !== undefined ? String(body.powerSupply) : undefined,
      lighting: body?.lighting !== undefined ? String(body.lighting) : undefined,
      notes: body?.notes !== undefined ? String(body.notes) : undefined,
    });
    return NextResponse.json({ survey });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId, surveyId } = await ctx.params;
    const row = await prisma.clientSiteSurvey.findFirst({ where: { id: surveyId, clientId } });
    if (!row) return jsonError("Ni najdeno.", 404);
    await deleteSiteSurvey(surveyId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
