import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-guard";
import { requireEspIngestAuth } from "@/lib/esp-ingest-token";
import { ingestVmsPayload, type VmsIngestPayload } from "@/lib/repositories/vms";

export async function POST(request: Request) {
  const auth = requireEspIngestAuth(request);
  if (auth) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as VmsIngestPayload;
    const result = await ingestVmsPayload(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[vms] ingest failed:", e);
    const message = e instanceof Error ? e.message : "Napaka pri VMS ingestu.";
    const status = /ni registriran|nima dodeljene/i.test(message) ? 403 : 400;
    return jsonError(message, status);
  }
}

