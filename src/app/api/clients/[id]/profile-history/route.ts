import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { getClientForSession } from "@/lib/repositories/clients";
import { listClientProfileChanges } from "@/lib/repositories/client-profile";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const { id } = await ctx.params;
    const c = await getClientForSession(id, session ?? undefined);
    if (!c) return jsonError("Stranka ne obstaja.", 404);
    const changes = await listClientProfileChanges(c.id, 200);
    return NextResponse.json({ changes });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
