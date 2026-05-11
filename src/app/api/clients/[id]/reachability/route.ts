import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";
import { runClientReachability } from "@/lib/repositories/client-hardware";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    await runClientReachability(clientId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return jsonError("Stranka ne obstaja.", 404);
    console.error(e);
    return jsonError("Preverjanje dosegljivosti ni uspelo.", 500);
  }
}
