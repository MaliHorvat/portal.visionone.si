import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const nid = Number(id);
    if (!Number.isFinite(nid)) return jsonError("Neveljaven ID.", 400);
    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    const content = String(body?.content ?? "");
    if (!title) return jsonError("Naslov je obvezen.");
    const note = await prisma.userNote.update({
      where: { id: nid },
      data: { title, content },
    });
    return NextResponse.json({ note });
  } catch {
    return jsonError("Beležka ne obstaja.", 404);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const nid = Number(id);
    if (!Number.isFinite(nid)) return jsonError("Neveljaven ID.", 400);
    await prisma.userNote.deleteMany({
      where: { OR: [{ id: nid }, { parentId: nid }] },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Brisanje ni uspelo.", 500);
  }
}
