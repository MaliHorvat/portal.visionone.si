import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";

type Ctx = { params: Promise<{ id: string }> };

const DEFAULT_CHECKLIST = [
  { id: "arrival", label: "Prihod na objekt", done: false },
  { id: "power", label: "Preverjeno napajanje", done: false },
  { id: "network", label: "Preverjena povezljivost", done: false },
  { id: "cleaning", label: "Osnovno čiščenje opreme", done: false },
  { id: "handover", label: "Predaja in razlaga stranki", done: false },
];

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const rows = await prisma.fieldVisit.findMany({
      where: { clientId, ownerUsername: own.session.username },
      orderBy: { checkInAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ visits: rows });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju terenskih obiskov.", 500);
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
    const visit = await prisma.fieldVisit.create({
      data: {
        ownerUsername: own.session.username,
        clientId,
        checkedInBy: own.session.username,
        checklist: DEFAULT_CHECKLIST,
        photoProofs: [],
      },
    });
    return NextResponse.json({ visit }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri check-in.", 500);
  }
}

