import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { prisma } from "@/lib/db";
import { getClientForSession } from "@/lib/repositories/clients";
import { createDocument, listDocumentFolders, listDocuments } from "@/lib/repositories/client-documents";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

function uploadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/doesn't exist|does not exist|Unknown table|'ClientDocument'|ClientDocument/i.test(msg)) {
    return "Manjkajoča tabela dokumentov — na strežniku zaženite: npx prisma db push";
  }
  if (msg.length > 0 && msg.length < 220) return msg;
  return "Nepričakovana napaka strežnika.";
}

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

    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      const kind = String(body?.kind ?? "").trim();
      if (kind !== "note") return jsonError("Nepodprt tip zahteve.");
      const folderRaw = body.folder;
      const folder = typeof folderRaw === "string" ? folderRaw.trim() : "";
      if (folder.includes("..") || folder.startsWith("/")) return jsonError("Neveljavna mapa.");
      const titleRaw = String(body.title ?? "zapis").trim() || "zapis";
      const text = String(body.text ?? "").trim();
      if (!text) return jsonError("Besedilo zapisa je prazno.");
      const safeName = titleRaw.toLowerCase().endsWith(".txt") ? titleRaw : `${titleRaw}.txt`;
      const buf = Buffer.from(text, "utf8");
      if (buf.length > MAX_BYTES) return jsonError("Zapis je predolg.");
      const row = await createDocument(clientId, {
        folder,
        originalName: safeName,
        mimeType: "text/plain; charset=utf-8",
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
    }

    const form = await request.formData();
    const rawFile = form.get("file");
    if (!rawFile || !(rawFile instanceof Blob)) {
      return jsonError("Manjka datoteka (polje file) ali neveljavna oblika.");
    }
    if (rawFile.size === 0) return jsonError("Prazna datoteka.");
    if (rawFile.size > MAX_BYTES) return jsonError("Datoteka je prevelika (max 25 MB).");

    const folderRaw = form.get("folder");
    const folder = typeof folderRaw === "string" ? folderRaw.trim() : "";
    if (folder.includes("..") || folder.startsWith("/")) return jsonError("Neveljavna mapa.");

    const originalName =
      typeof File !== "undefined" && rawFile instanceof File && rawFile.name?.trim()
        ? rawFile.name.trim()
        : "datoteka";

    const buf = Buffer.from(await rawFile.arrayBuffer());
    const mimeType =
      typeof File !== "undefined" && rawFile instanceof File && rawFile.type
        ? rawFile.type
        : "application/octet-stream";

    const row = await createDocument(clientId, {
      folder,
      originalName,
      mimeType,
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
    const es = String(e);
    const status = /does not exist|doesn't exist|Unknown table/i.test(es) ? 503 : 500;
    return jsonError(uploadErrorMessage(e), status);
  }
}
