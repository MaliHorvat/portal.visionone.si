import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { createClient, listClients } from "@/lib/repositories/clients";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const clients = await listClients();
    return NextResponse.json({ clients });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju strank.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) return jsonError("Polje 'name' je obvezno.");
    const created = await createClient({
      name,
      address: body?.address ?? "",
      contact: body?.contact ?? "",
      email: body?.email ?? "",
      health: body?.health === "alarm" ? "alarm" : "ok",
      packageId: body?.packageId ?? null,
    });
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju stranke.", 500);
  }
}
