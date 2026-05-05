import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const notes = await prisma.userNote.findMany({
      orderBy: [{ isFolder: "desc" }, { title: "asc" }],
    });
    return NextResponse.json({ notes });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju beležk.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const body = await request.json();
    const title = String(body?.title ?? "").trim();
    const content = String(body?.content ?? "");
    const isFolder = Boolean(body?.isFolder);
    const parentId =
      body?.parentId === undefined || body?.parentId === null ? null : Number(body.parentId);
    if (!title) return jsonError("Naslov je obvezen.");
    const note = await prisma.userNote.create({
      data: {
        title,
        content,
        isFolder,
        parentId: parentId !== null && !Number.isNaN(parentId) ? parentId : null,
      },
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju beležke.", 500);
  }
}
