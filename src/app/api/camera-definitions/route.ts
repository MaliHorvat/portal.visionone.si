import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { appendAuditLog } from "@/lib/repositories/audit-log";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const rows = await prisma.cameraDefinition.findMany({ orderBy: { manufacturer: "asc" } });
    return NextResponse.json({ definitions: rows });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju definicij.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const body = await request.json();
    const manufacturer = String(body?.manufacturer ?? "").trim();
    const mainStream = String(body?.mainStream ?? "").trim();
    const subStream = String(body?.subStream ?? "").trim();
    if (!manufacturer) return jsonError("Polje 'manufacturer' je obvezno.");
    await prisma.cameraDefinition.upsert({
      where: { manufacturer },
      create: { manufacturer, mainStream, subStream },
      update: { mainStream, subStream },
    });
    await appendAuditLog("admin", "camera_definition_upsert", manufacturer);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju definicije.", 500);
  }
}

export async function DELETE(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  const url = new URL(request.url);
  const manufacturer = url.searchParams.get("manufacturer")?.trim() ?? "";
  if (!manufacturer) return jsonError("Query 'manufacturer' je obvezen.");
  try {
    await prisma.cameraDefinition.delete({ where: { manufacturer } });
    await appendAuditLog("admin", "camera_definition_delete", manufacturer);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Definicija ne obstaja.", 404);
  }
}
