import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { deleteReminder, updateReminder } from "@/lib/repositories/reminders";
import type { ReminderKind } from "@/lib/types";

const VALID_KINDS: ReminderKind[] = ["ciscenje_kamer", "diski", "servis", "drugo"];

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const kind = VALID_KINDS.includes(body?.kind) ? (body.kind as ReminderKind) : undefined;
    const updated = await updateReminder(id, {
      clientId: body?.clientId,
      title: body?.title,
      dueDate: body?.dueDate,
      kind,
      completed: body?.completed === undefined ? undefined : Boolean(body.completed),
    });
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
    const { id } = await ctx.params;
    await deleteReminder(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju opomnika.", 500);
  }
}
