import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { isDbConfigured } from "@/lib/db";
import { createStandaloneRack, listStandaloneRacks } from "@/lib/repositories/standalone-racks";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured()) return jsonError("DB ni nastavljena.", 500);
  try {
    const racks = await listStandaloneRacks();
    return NextResponse.json({ racks });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju rack projektov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured()) return jsonError("DB ni nastavljena.", 500);
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const rackData = body?.rackData as Prisma.InputJsonValue | undefined;
    const data = rackData ?? [];
    const rack = await createStandaloneRack(name || "Rack", data);
    return NextResponse.json({ rack }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju rack projekta.", 500);
  }
}
