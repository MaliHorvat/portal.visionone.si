import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { listIpam, replaceIpam } from "@/lib/repositories/portal-ipam";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const rows = await listIpam(session.username);
    return NextResponse.json({ entries: rows });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function PUT(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const body = (await request.json().catch(() => ({}))) as {
      entries?: Array<{ ip: string; name: string; mac?: string }>;
    };
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    await replaceIpam(
      session.username,
      entries.map((e) => ({
        ip: String(e.ip ?? ""),
        name: String(e.name ?? ""),
        mac: e.mac ? String(e.mac) : "",
      })),
    );
    return NextResponse.json({ ok: true, count: entries.length });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju IPAM.", 500);
  }
}
