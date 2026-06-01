import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { seedCameraDefinitions } from "@/lib/repositories/camera-definitions";

export async function POST() {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const result = await seedCameraDefinitions();
    await appendAuditLog("admin", "camera_definitions_seed", JSON.stringify(result));
    return NextResponse.json({ ok: true, upserted: result.upserted });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri nalaganju predlog.", 500);
  }
}
