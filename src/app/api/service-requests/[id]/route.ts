import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";
import {
  deleteServiceRequestForSession,
  updateServiceRequestForSession,
  type UpsertServiceRequestInput,
} from "@/lib/repositories/service-requests";
import { sendTelegramNotification } from "@/lib/telegram-notify";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUS = new Set(["new", "in_progress", "waiting_customer", "done"]);
const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username?.trim()) return jsonError("Seja ni veljavna.", 401);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.clientId !== undefined && body.clientId !== null && String(body.clientId).trim() !== "") {
      if (!(await assertClientOwnedBySession(String(body.clientId), session))) return jsonError("Stranka ne obstaja.", 404);
    }

    const input: UpsertServiceRequestInput = {
      clientId:
        body.clientId === undefined ? undefined : body.clientId == null || String(body.clientId).trim() === "" ? null : String(body.clientId),
      title: body.title === undefined ? undefined : String(body.title),
      description: body.description === undefined ? undefined : String(body.description),
      dueDate: body.dueDate === undefined ? undefined : String(body.dueDate),
      assignee: body.assignee === undefined ? undefined : String(body.assignee),
      status: VALID_STATUS.has(String(body.status ?? ""))
        ? (String(body.status) as UpsertServiceRequestInput["status"])
        : undefined,
      priority: VALID_PRIORITY.has(String(body.priority ?? ""))
        ? (String(body.priority) as UpsertServiceRequestInput["priority"])
        : undefined,
    };
    const updated = await updateServiceRequestForSession(id, session, input);
    if (!updated) return jsonError("Zahtevek ne obstaja.", 404);
    await appendAuditLog(session.username, "service_request_update", `${updated.id}|${updated.status}|${updated.priority}`);
    if (updated.status === "done") {
      void sendTelegramNotification(
        `✅ Zahtevek zaključen\nNaslov: ${updated.title}\nStranka: ${updated.clientName || "-"}`,
        "service_request_done",
      );
    } else {
      void sendTelegramNotification(
        `🛠️ Posodobljen zahtevek\nNaslov: ${updated.title}\nStatus: ${updated.status}\nPrioriteta: ${updated.priority}\nStranka: ${updated.clientName || "-"}`,
        "service_request_update",
      );
    }
    return NextResponse.json({ request: updated });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri posodobitvi zahtevka.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username?.trim()) return jsonError("Seja ni veljavna.", 401);
    const { id } = await ctx.params;
    const ok = await deleteServiceRequestForSession(id, session);
    if (!ok) return jsonError("Zahtevek ne obstaja.", 404);
    await appendAuditLog(session.username, "service_request_delete", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri brisanju zahtevka.", 500);
  }
}

