import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const views = await prisma.savedView.findMany({ orderBy: { id: "desc" } });
    return NextResponse.json({ views });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju pogledov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const layout = body?.layout as Prisma.InputJsonValue;
    if (!name) return jsonError("Ime je obvezno.");
    if (layout === undefined || layout === null) return jsonError("Layout JSON je obvezen.");
    const view = await prisma.savedView.create({ data: { name, layout } });
    return NextResponse.json({ view }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju pogleda.", 500);
  }
}
