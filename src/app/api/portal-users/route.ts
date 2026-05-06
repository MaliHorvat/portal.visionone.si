import bcrypt from "bcryptjs";
import type { PortalUserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { getPortalSession } from "@/lib/get-portal-session";
import { appendAuditLog } from "@/lib/repositories/audit-log";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function GET() {
  const session = await getPortalSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Prepovedano" }, { status: 403 });
  }
  if (!isDbConfigured() || !prisma) {
    return NextResponse.json({ error: "Baza ni nastavljena." }, { status: 503 });
  }
  const users = await prisma.appUserAccount.findMany({
    orderBy: { username: "asc" },
    select: { id: true, username: true, email: true, role: true, mustChangePassword: true },
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Prepovedano" }, { status: 403 });
  }
  if (!isDbConfigured() || !prisma) {
    return NextResponse.json({ error: "Baza ni nastavljena." }, { status: 503 });
  }

  let body: { username?: string; email?: string; password?: string; role?: PortalUserRole };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Neveljavna JSON telesa." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const role = (body.role ?? "viewer") as PortalUserRole;

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Uporabniško ime: 3–32 znakov (črke, številke, _ . -)." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Geslo mora imeti vsaj 8 znakov." }, { status: 400 });
  }
  if (role !== "admin" && role !== "operator" && role !== "viewer") {
    return NextResponse.json({ error: "Neveljavna vloga." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.appUserAccount.create({
      data: {
        username,
        email,
        passwordHash,
        role,
        isAdmin: role === "admin",
        mustChangePassword: false,
      },
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Uporabnik s tem imenom že obstaja." }, { status: 409 });
    }
    console.error("[portal-users] create:", e);
    return NextResponse.json({ error: "Shranjevanje ni uspelo." }, { status: 500 });
  }

  await appendAuditLog(session.username, "portal_user_create", `${username}|${role}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getPortalSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Prepovedano" }, { status: 403 });
  }
  if (!isDbConfigured() || !prisma) {
    return NextResponse.json({ error: "Baza ni nastavljena." }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Manjka id." }, { status: 400 });
  }

  const victim = await prisma.appUserAccount.findUnique({ where: { id } });
  if (!victim) {
    return NextResponse.json({ error: "Ni najdeno." }, { status: 404 });
  }
  if (victim.username === "admin") {
    return NextResponse.json({ error: "Glavnega računa admin ni dovoljeno izbrisati." }, { status: 400 });
  }
  if (victim.username === session.username) {
    return NextResponse.json({ error: "Lastnega računa ne morete izbrisati." }, { status: 400 });
  }
  if (victim.role === "admin") {
    const admins = await prisma.appUserAccount.count({ where: { role: "admin" } });
    if (admins <= 1) {
      return NextResponse.json({ error: "Zadnjega administratorja ni dovoljeno izbrisati." }, { status: 400 });
    }
  }

  await prisma.appUserAccount.delete({ where: { id } });
  await appendAuditLog(session.username, "portal_user_delete", victim.username);
  return NextResponse.json({ ok: true });
}
