import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { getMojSystemStatus } from "@/lib/repositories/moj-status";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const status = await getMojSystemStatus(session ?? undefined);
    return NextResponse.json(status);
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju stanja sistema.", 500);
  }
}
