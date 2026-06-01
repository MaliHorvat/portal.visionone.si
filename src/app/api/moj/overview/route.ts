import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { getMojOverview } from "@/lib/repositories/moj-overview";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const overview = await getMojOverview(session ?? undefined);
    return NextResponse.json(overview);
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju podatkov.", 500);
  }
}
