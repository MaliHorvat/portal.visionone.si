import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { deletePackage, getPackage, updatePackage } from "@/lib/repositories/packages";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const pkg = await getPackage(id);
    if (!pkg) return jsonError("Paket ne obstaja.", 404);
    return NextResponse.json({ package: pkg });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju paketa.", 500);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const updated = await updatePackage(id, {
      name: body?.name,
      price: body?.price !== undefined ? Number(body.price) : undefined,
      description: body?.description,
    });
    return NextResponse.json({ package: updated });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri urejanju paketa.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    await deletePackage(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju paketa.", 500);
  }
}
