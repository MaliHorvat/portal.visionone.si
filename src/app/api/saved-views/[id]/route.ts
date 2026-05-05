import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const vid = Number(id);
    if (!Number.isFinite(vid)) return jsonError("Neveljaven ID.", 400);
    await prisma.savedView.delete({ where: { id: vid } });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Pogled ne obstaja.", 404);
  }
}
