import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { prisma } from "@/lib/db";
import { getClientForSession } from "@/lib/repositories/clients";
import { createDocument, listDocumentFolders, listDocuments } from "@/lib/repositories/client-documents";

const MAX_BYTES = 25 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const session = await getPortalSession();
    const { id: clientId } = await ctx.params;
    const allowed = await getClientForSession(clientId, session ?? undefined);
    if (!allowed) return jsonError("Stranka ne obstaja.", 404);
    const url = new URL(request.url);
    const hasFolderFilter = url.searchParams.has("folder");
    const folderVal = url.searchParams.get("folder");
    const folders = await listDocumentFolders(clientId);
    const docs = hasFolderFilter ? await listDocuments(clientId, folderVal ?? "") : await listDocuments(clientId);
    return NextResponse.json({ folders, documents: docs });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const session = await getPortalSession();
    const { id: clientId } = await ctx.params;
    const allowed = await getClientForSession(clientId, session ?? undefined);
    if (!allowed) return jsonError("Stranka ne obstaja.", 404);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Manjka datoteka (polje file).");
    const folderRaw = form.get("folder");
    const folder = typeof folderRaw === "string" ? folderRaw.trim() : "";
    if (folder.includes("..") || folder.startsWith("/")) return jsonError("Neveljavna mapa.");
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) return jsonError("Prazna datoteka.");
    if (buf.length > MAX_BYTES) return jsonError("Datoteka je prevelika (max 25 MB).");
    const row = await createDocument(clientId, {
      folder,
      originalName: file.name || "datoteka",
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buf.length,
      data: buf,
    });
    return NextResponse.json({
      document: {
        id: row.id,
        folder: row.folder,
        originalName: row.originalName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri nalaganju.", 500);
  }
}
