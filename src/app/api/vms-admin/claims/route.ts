import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { createVmsGatewayClaim } from "@/lib/repositories/vms-admin";

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      siteId?: string;
      name?: string;
      externalId?: string;
      daysValid?: number | string;
    };
    const siteId = String(body.siteId ?? "").trim();
    if (!siteId) return jsonError("Objekt je obvezen.");
    const daysValid = Number(body.daysValid ?? 30);
    const claim = await createVmsGatewayClaim(siteId, {
      name: body.name,
      externalId: body.externalId,
      daysValid: Number.isFinite(daysValid) ? daysValid : 30,
    });
    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    console.error("[vms-admin] create claim failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri ustvarjanju gateway claim kode.", 500);
  }
}
