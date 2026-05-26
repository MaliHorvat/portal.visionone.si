import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { createVmsCamera } from "@/lib/repositories/vms-admin";

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      siteId?: string;
      name?: string;
      channel?: number | string;
      ip?: string;
      model?: string;
    };
    const siteId = String(body.siteId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const channel = Number(body.channel ?? 1);
    if (!siteId) return jsonError("Objekt je obvezen.");
    if (!name) return jsonError("Ime kamere je obvezno.");
    if (!Number.isFinite(channel) || channel < 1) return jsonError("Kanal kamere je neveljaven.");
    const camera = await createVmsCamera(siteId, { name, channel, ip: body.ip, model: body.model });
    return NextResponse.json({ camera }, { status: 201 });
  } catch (err) {
    console.error("[vms-admin] create camera failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri ustvarjanju VMS kamere.", 500);
  }
}
