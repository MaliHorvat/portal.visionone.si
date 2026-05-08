import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { reorderClientsForSession } from "@/lib/repositories/clients";

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const body = (await request.json().catch(() => ({}))) as { orderedIds?: unknown };
    if (!Array.isArray(body.orderedIds)) return jsonError("Neveljaven vrstni red.");
    const orderedIds = body.orderedIds.map((v) => String(v)).filter((v) => v.length > 0);
    await reorderClientsForSession(orderedIds, session ?? undefined);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju vrstnega reda strank.", 500);
  }
}
