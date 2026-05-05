import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { createReminder, listReminders } from "@/lib/repositories/reminders";
import type { ReminderKind } from "@/lib/types";

const VALID_KINDS: ReminderKind[] = ["ciscenje_kamer", "diski", "servis", "drugo"];

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const reminders = await listReminders();
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
    const body = await request.json();
    const clientId = String(body?.clientId ?? "");
    const title = String(body?.title ?? "").trim();
    const dueDate = String(body?.dueDate ?? "");
    if (!clientId) return jsonError("Polje 'clientId' je obvezno.");
    if (!title) return jsonError("Polje 'title' je obvezno.");
    if (!dueDate) return jsonError("Polje 'dueDate' je obvezno.");
    const kind: ReminderKind = VALID_KINDS.includes(body?.kind) ? body.kind : "drugo";
    const created = await createReminder({
      clientId,
      title,
      dueDate,
      kind,
      completed: Boolean(body?.completed),
    });
    return NextResponse.json({ reminder: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju opomnika.", 500);
  }
}
