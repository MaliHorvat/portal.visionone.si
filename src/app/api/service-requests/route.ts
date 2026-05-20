import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";
import {
  createServiceRequestForSession,
  listServiceRequestsForSession,
  type UpsertServiceRequestInput,
} from "@/lib/repositories/service-requests";
import { sendTelegramNotification } from "@/lib/telegram-notify";

const VALID_STATUS = new Set(["new", "in_progress", "waiting_customer", "done"]);
const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const rows = await listServiceRequestsForSession(session ?? undefined);
    return NextResponse.json({ requests: rows });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju zahtevkov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    if (!session?.username?.trim()) return jsonError("Seja ni veljavna.", 401);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    if (!title) return jsonError("Naslov zahtevka je obvezen.");

    const clientId = body.clientId == null || String(body.clientId).trim() === "" ? null : String(body.clientId);
    if (clientId && !(await assertClientOwnedBySession(clientId, session))) {
      return jsonError("Stranka ne obstaja.", 404);
    }

    const input: UpsertServiceRequestInput = {
      title,
      description: String(body.description ?? "").trim(),
      clientId,
      dueDate: String(body.dueDate ?? "").trim(),
      assignee: String(body.assignee ?? "").trim(),
      status: VALID_STATUS.has(String(body.status ?? "")) ? (String(body.status) as UpsertServiceRequestInput["status"]) : "new",
      priority: VALID_PRIORITY.has(String(body.priority ?? ""))
        ? (String(body.priority) as UpsertServiceRequestInput["priority"])
        : "medium",
    };

    const created = await createServiceRequestForSession(session, input);
    await appendAuditLog(session.username, "service_request_create", `${created.id}|${created.title}`);
    void sendTelegramNotification(
      `🆕 Nov zahtevek\nNaslov: ${created.title}\nPrioriteta: ${created.priority}\nStranka: ${created.clientName || "-"}\nUstvaril: ${session.username}`,
      "service_request",
    );
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju zahtevka.", 500);
  }
}

