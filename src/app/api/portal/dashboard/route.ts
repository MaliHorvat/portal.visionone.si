import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { getPortalDashboard } from "@/lib/repositories/dashboard";
import { isPrismaJsonParseError, repairAllJsonColumns } from "@/lib/db-json-repair";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const payload = await getPortalDashboard(session ?? undefined);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[api/portal/dashboard]", err);
    if (isPrismaJsonParseError(err)) {
      try {
        await repairAllJsonColumns();
        const session = await getPortalSession();
        const payload = await getPortalDashboard(session ?? undefined);
        return NextResponse.json(payload);
      } catch (retryErr) {
        console.error("[api/portal/dashboard] retry failed:", retryErr);
      }
    }
    return jsonError("Napaka pri nalaganju nadzorne plošče.", 500);
  }
}
