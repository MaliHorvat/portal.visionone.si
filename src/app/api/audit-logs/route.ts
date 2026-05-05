import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { listAuditLogs } from "@/lib/repositories/audit-log";

export async function GET(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  try {
    const logs = await listAuditLogs(limit);
    return NextResponse.json({ logs });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju audit loga.", 500);
  }
}
