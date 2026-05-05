import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { getPortalSession } from "@/lib/get-portal-session";
import { appendAuditLog } from "@/lib/repositories/audit-log";

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "Ni portalne seje." }, { status: 401 });
  }

  if (!isDbConfigured() || !prisma) {
    return NextResponse.json({ error: "Baza ni nastavljena." }, { status: 503 });
  }

  let body: { currentPassword?: string; newPassword?: string; confirmPassword?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Neveljavno telo." }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Novo geslo mora imeti vsaj 8 znakov." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Novi gesli se ne ujemata." }, { status: 400 });
  }

  const row = await prisma.appUserAccount.findUnique({ where: { username: session.username } });
  if (!row) {
    return NextResponse.json({ error: "Uporabnik v bazi ni najden." }, { status: 404 });
  }

  const ok = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Trenutno geslo ni pravilno." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.appUserAccount.update({
    where: { id: row.id },
    data: { passwordHash },
  });

  await appendAuditLog(session.username, "portal_password_change", "uspešno");
  return NextResponse.json({ ok: true });
}
