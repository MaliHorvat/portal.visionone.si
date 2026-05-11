import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";
import { deleteReminder, reminderBelongsToSession, updateReminder } from "@/lib/repositories/reminders";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import type { ReminderKind } from "@/lib/types";

const VALID_KINDS: ReminderKind[] = ["ciscenje_kamer", "diski", "servis", "drugo"];

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username?.trim()) return jsonError("Seja ni veljavna.", 401);
    const { id } = await ctx.params;
    if (!(await reminderBelongsToSession(id, session))) return jsonError("Opomnik ne obstaja.", 404);
    const body = await request.json();
    if (body?.clientId != null) {
      const nextClientId = String(body.clientId);
      if (!(await assertClientOwnedBySession(nextClientId, session))) {
        return jsonError("Stranka ne obstaja.", 404);
      }
    }
    const kind = VALID_KINDS.includes(body?.kind) ? (body.kind as ReminderKind) : undefined;
    const updated = await updateReminder(id, {
      clientId: body?.clientId,
      title: body?.title,
      dueDate: body?.dueDate,
      kind,
      completed: body?.completed === undefined ? undefined : Boolean(body.completed),
    });
    void sendTelegramNotification(
      `🔁 Opomnik posodobljen\nNaslov: ${updated.title}\nStranka: ${updated.clientName || "-"}\nRok: ${updated.dueDate}\nStatus: ${updated.completed ? "opravljeno" : "odprto"}`,
    );
    return NextResponse.json({ reminder: updated });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri urejanju opomnika.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username?.trim()) return jsonError("Seja ni veljavna.", 401);
    const { id } = await ctx.params;
    if (!(await reminderBelongsToSession(id, session))) return jsonError("Opomnik ne obstaja.", 404);
    await deleteReminder(id);
    void sendTelegramNotification(`🗑️ Opomnik izbrisan\nID: ${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju opomnika.", 500);
  }
}
