import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { prisma } from "@/lib/db";
import { getClientForSession } from "@/lib/repositories/clients";
import { deleteDocument, getDocumentBlob } from "@/lib/repositories/client-documents";

type Ctx = { params: Promise<{ id: string; docId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const session = await getPortalSession();
    const { id: clientId, docId } = await ctx.params;
    const allowed = await getClientForSession(clientId, session ?? undefined);
    if (!allowed) return jsonError("Stranka ne obstaja.", 404);
    const row = await getDocumentBlob(clientId, docId);
    if (!row) return jsonError("Ni najdeno.", 404);
    const bytes = Buffer.from(row.data);
    return new NextResponse(bytes, {
      headers: {
        "content-type": row.mimeType || "application/octet-stream",
        "content-length": String(bytes.length),
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
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
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const session = await getPortalSession();
    const { id: clientId, docId } = await ctx.params;
    const allowed = await getClientForSession(clientId, session ?? undefined);
    if (!allowed) return jsonError("Stranka ne obstaja.", 404);
    const ok = await deleteDocument(clientId, docId);
    if (!ok) return jsonError("Ni najdeno.", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
