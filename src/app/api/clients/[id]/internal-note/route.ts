import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { getClientForSession } from "@/lib/repositories/clients";
import { getClientProfileNote, upsertClientProfileNote } from "@/lib/repositories/client-profile";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const { id } = await ctx.params;
    const c = await getClientForSession(id, session ?? undefined);
    if (!c) return jsonError("Stranka ne obstaja.", 404);
    const note = await getClientProfileNote(c.id);
    return NextResponse.json({
      content: note?.content ?? "",
      updatedBy: note?.updatedBy ?? "",
      updatedAt: note?.updatedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const { id } = await ctx.params;
    const c = await getClientForSession(id, session ?? undefined);
    if (!c) return jsonError("Stranka ne obstaja.", 404);
    const body = (await request.json().catch(() => ({}))) as { content?: string };
    const content = String(body?.content ?? "");
    await upsertClientProfileNote(c.id, content, session.username);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju.", 500);
  }
}
