import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import {
  addAttachment,
  deleteAttachment,
  listAttachments,
} from "@/lib/repositories/service-request-attachments";
import { getServiceRequestForSession } from "@/lib/repositories/service-requests";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const { id } = await ctx.params;
    const req = await getServiceRequestForSession(id, session);
    if (!req) return jsonError("Zahtevek ne obstaja.", 404);
    const files = await listAttachments(id);
    return NextResponse.json({ attachments: files });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const { id } = await ctx.params;
    const req = await getServiceRequestForSession(id, session);
    if (!req) return jsonError("Zahtevek ne obstaja.", 404);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Manjka datoteka (polje file).");
    const buf = Buffer.from(await file.arrayBuffer());
    const created = await addAttachment(id, file.name, file.type || "application/octet-stream", buf);
    return NextResponse.json({ attachment: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Napaka.";
    return jsonError(msg, 400);
  }
}
