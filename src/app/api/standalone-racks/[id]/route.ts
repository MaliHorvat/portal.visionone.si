import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { isDbConfigured } from "@/lib/db";
import {
  deleteStandaloneRack,
  getStandaloneRack,
  updateStandaloneRack,
} from "@/lib/repositories/standalone-racks";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured()) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const rack = await getStandaloneRack(id);
    if (!rack) return jsonError("Projekt ne obstaja.", 404);
    return NextResponse.json({ rack });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju projekta.", 500);
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured()) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const name = body?.name !== undefined ? String(body.name).trim() : undefined;
    const rackData = body?.rackData as Prisma.InputJsonValue | undefined;
    const rack = await updateStandaloneRack(id, {
      ...(name !== undefined ? { name: name || "Rack" } : {}),
      ...(rackData !== undefined ? { rackData } : {}),
    });
    return NextResponse.json({ rack });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju projekta.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured()) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    await deleteStandaloneRack(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju projekta.", 500);
  }
}
