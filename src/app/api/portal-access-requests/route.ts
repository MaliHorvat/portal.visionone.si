import bcrypt from "bcryptjs";
import { type PortalAccessRequestStatus, type PortalUserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/get-portal-session";
import { isDbConfigured } from "@/lib/db";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import {
  createPortalUserFromRequest,
  listPortalAccessRequests,
  setPortalAccessRequestStatus,
} from "@/lib/repositories/portal-access-requests";
import { sendPortalEmail } from "@/lib/send-portal-access-notify";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

function isAdmin(session: Awaited<ReturnType<typeof getPortalSession>>) {
  return session?.role === "admin";
}

export async function GET() {
  const session = await getPortalSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Prepovedano" }, { status: 403 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Baza ni nastavljena." }, { status: 503 });
  }
  const rows = await listPortalAccessRequests();
  return NextResponse.json({ requests: rows });
}

export async function PATCH(request: Request) {
  const session = await getPortalSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Prepovedano" }, { status: 403 });
  }
  const adminUser = session?.username ?? "admin";
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Baza ni nastavljena." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    status?: PortalAccessRequestStatus;
    note?: string;
  };
  const id = String(body.id ?? "");
  const status = body.status;
  if (!id || !status || !["new", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Neveljavni podatki." }, { status: 400 });
  }
  const row = await setPortalAccessRequestStatus(id, status, adminUser, String(body.note ?? ""));
  if (!row) {
    return NextResponse.json({ error: "Zahtevek ni najden." }, { status: 404 });
  }
  await appendAuditLog(adminUser, "portal_access_request_status", `${row.clerkEmail}|${status}`);
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Prepovedano" }, { status: 403 });
  }
  const adminUser = session?.username ?? "admin";
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Baza ni nastavljena." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
    username?: string;
    password?: string;
    role?: PortalUserRole;
  };
  const requestId = String(body.requestId ?? "").trim();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const role = (body.role ?? "viewer") as PortalUserRole;
  if (!requestId || !USERNAME_RE.test(username) || password.length < 8) {
    return NextResponse.json({ error: "Neveljaven vnos." }, { status: 400 });
  }
  if (!["admin", "operator", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Neveljavna vloga." }, { status: 400 });
  }
  const requests = await listPortalAccessRequests();
  const target = requests.find((x) => x.id === requestId);
  if (!target) return NextResponse.json({ error: "Zahtevek ne obstaja." }, { status: 404 });

  const passwordHash = await bcrypt.hash(password, 12);
  let created;
  try {
    created = await createPortalUserFromRequest({
      requestId,
      username,
      email: target.clerkEmail,
      passwordHash,
      role,
      processedBy: adminUser,
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Uporabniško ime že obstaja." }, { status: 409 });
    }
    throw e;
  }
  await appendAuditLog(adminUser, "portal_user_create_from_request", `${username}|${target.clerkEmail}`);

  let mailSent = false;
  if (target.clerkEmail) {
    const mail = await sendPortalEmail({
      to: target.clerkEmail,
      subject: "VisionOne portal — vaš račun je pripravljen",
      text: `Pozdravljeni,\n\nvaš portalni račun je pripravljen.\n\nUporabniško ime: ${username}\nZačasno geslo: ${password}\n\nPo prijavi ga takoj spremenite na strani Moj račun.\n\nLep pozdrav,\nVisionOne`,
    });
    mailSent = mail.sent;
  }

  return NextResponse.json({ ok: true, user: created?.user, mailSent });
}
