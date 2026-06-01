import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import {
  getCareBoxDashboardCounts,
  listCareBoxOverview,
} from "@/lib/repositories/care-box";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const [rows, counts] = await Promise.all([
      listCareBoxOverview(session ?? undefined),
      getCareBoxDashboardCounts(session ?? undefined),
    ]);
    return NextResponse.json({ rows, counts });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju Care Box pregleda.", 500);
  }
}
