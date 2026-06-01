import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";
import { createReminder, listRemindersForSession } from "@/lib/repositories/reminders";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import type { ReminderKind } from "@/lib/types";

const VALID_KINDS: ReminderKind[] = [
  "ciscenje_kamer",
  "diski",
  "servis",
  "menjava_diska",
  "preventivni_pregled",
  "fw_posodobitev",
  "baterije_ups",
  "pregled_sistema",
  "certifikati",
  "drugo",
];

export async function GET(request: NextRequest) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;
    const clientVisibleOnly = session?.role === "viewer";
    const reminders = await listRemindersForSession(session ?? undefined, clientId ?? undefined, {
      clientVisibleOnly,
    });
    return NextResponse.json({ reminders });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju opomnikov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username?.trim()) return jsonError("Seja ni veljavna.", 401);
    const body = await request.json();
    const clientId = String(body?.clientId ?? "");
    const title = String(body?.title ?? "").trim();
    const dueDate = String(body?.dueDate ?? "");
    if (!clientId) return jsonError("Polje 'clientId' je obvezno.");
    if (!title) return jsonError("Polje 'title' je obvezno.");
    if (!dueDate) return jsonError("Polje 'dueDate' je obvezno.");
    if (!(await assertClientOwnedBySession(clientId, session))) {
      return jsonError("Stranka ne obstaja.", 404);
    }
    const kind: ReminderKind = VALID_KINDS.includes(body?.kind) ? body.kind : "drugo";
    const created = await createReminder({
      clientId,
      title,
      dueDate,
      kind,
      completed: Boolean(body?.completed),
      clientVisible: body?.clientVisible !== false,
    });
    void sendTelegramNotification(
      `🗓️ Nov opomnik\nNaslov: ${created.title}\nStranka: ${created.clientName || "-"}\nRok: ${created.dueDate}\nTip: ${created.kind}`,
      "reminder",
    );
    return NextResponse.json({ reminder: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju opomnika.", 500);
  }
}
