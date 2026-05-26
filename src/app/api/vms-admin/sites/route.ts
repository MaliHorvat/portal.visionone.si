import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { createVmsSite } from "@/lib/repositories/vms-admin";

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      customerId?: string;
      name?: string;
      address?: string;
      nvrName?: string;
      nvrIp?: string;
      nvrModel?: string;
    };
    const customerId = String(body.customerId ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!customerId) return jsonError("VMS stranka je obvezna.");
    if (!name) return jsonError("Ime objekta je obvezno.");
    const site = await createVmsSite(customerId, {
      name,
      address: body.address,
      nvrName: body.nvrName,
      nvrIp: body.nvrIp,
      nvrModel: body.nvrModel,
    });
    return NextResponse.json({ site }, { status: 201 });
  } catch (err) {
    console.error("[vms-admin] create site failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri ustvarjanju VMS objekta.", 500);
  }
}
