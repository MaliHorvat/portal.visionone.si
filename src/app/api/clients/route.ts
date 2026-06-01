import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { createClientForSession, listClientsForSession } from "@/lib/repositories/clients";
import { sendTelegramNotification } from "@/lib/telegram-notify";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const clients = await listClientsForSession(session ?? undefined);
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
    const session = await getPortalSession();
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    if (!name) return jsonError("Polje 'name' je obvezno.");
    const tagsRaw = body?.tags;
    const tags = Array.isArray(tagsRaw)
      ? tagsRaw.filter((x: unknown): x is string => typeof x === "string").map((t) => t.trim()).filter(Boolean)
      : [];
    const created = await createClientForSession({
      name,
      address: body?.address ?? "",
      contact: body?.contact ?? "",
      phone: body?.phone ?? "",
      email: body?.email ?? "",
      health: body?.health === "alarm" ? "alarm" : "ok",
      packageId: body?.packageId ?? null,
      mojPortalEnabled: Boolean(body?.mojPortalEnabled),
      tags,
    }, session ?? undefined);
    void sendTelegramNotification(
      `🏢 Nova stranka\nIme: ${created.name}\nNaslov: ${created.address || "-"}`,
      "client_new",
    );
    return NextResponse.json({ client: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju stranke.", 500);
  }
}
