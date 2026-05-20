import { NextResponse } from "next/server";
import { jsonError, requirePortalSession, requirePortalRole } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import {
  createOfferTemplate,
  deleteOfferTemplate,
  listOfferTemplates,
  type TemplateLine,
} from "@/lib/repositories/offer-templates";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const templates = await listOfferTemplates(session.username, session.role === "admin");
    return NextResponse.json({ templates });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      lines?: TemplateLine[];
    };
    const name = String(body?.name ?? "").trim();
    if (!name) return jsonError("Ime predloge je obvezno.");
    const lines = Array.isArray(body?.lines) ? body.lines : [];
    const tpl = await createOfferTemplate(session.username, name, lines);
    return NextResponse.json({ template: tpl }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri shranjevanju predloge.", 500);
  }
}

export async function DELETE(request: Request) {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username) return jsonError("Seja ni veljavna.", 401);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Manjka id.");
    await deleteOfferTemplate(id, session.username, session.role === "admin");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
