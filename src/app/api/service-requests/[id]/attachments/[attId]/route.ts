import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { deleteAttachment, getAttachmentBytes } from "@/lib/repositories/service-request-attachments";
import { getServiceRequestForSession } from "@/lib/repositories/service-requests";

type Ctx = { params: Promise<{ id: string; attId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const { id, attId } = await ctx.params;
    const req = await getServiceRequestForSession(id, session);
    if (!req) return jsonError("Zahtevek ne obstaja.", 404);
    const row = await getAttachmentBytes(attId, id);
    if (!row?.data) return jsonError("Datoteka ne obstaja.", 404);
    return new NextResponse(row.data, {
      headers: {
        "content-type": row.mimeType || "application/octet-stream",
        "content-disposition": `attachment; filename="${encodeURIComponent(row.originalName)}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const { id, attId } = await ctx.params;
    const req = await getServiceRequestForSession(id, session);
    if (!req) return jsonError("Zahtevek ne obstaja.", 404);
    await deleteAttachment(attId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
