import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getPortalSession } from "@/lib/get-portal-session";
import { listAllOffersForSession } from "@/lib/repositories/client-offers";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const session = await getPortalSession();
    const isAdmin = session?.role === "admin";
    const offers = await listAllOffersForSession(session?.username ?? null, isAdmin);
    return NextResponse.json({ offers });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
