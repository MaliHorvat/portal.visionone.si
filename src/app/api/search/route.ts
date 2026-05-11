import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";

type SearchItem = {
  id: string;
  type: "client" | "user" | "reminder" | "request";
  label: string;
  href: string;
  meta?: string;
};

export async function GET(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  const session = await getPortalSession();
  const scope = session?.username?.trim()
    ? { ownerUsername: session.username }
    : { ownerUsername: "__portal_no_owner__" };
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] as SearchItem[] });
  if (!isDbConfigured() || !prisma) return jsonError("Baza ni nastavljena.", 503);

  const owner = session?.username?.trim();
  const userSearchWhere =
    session?.role === "admin"
      ? { OR: [{ username: { contains: q } }, { email: { contains: q } }] }
      : owner
        ? {
            username: owner,
            OR: [{ username: { contains: q } }, { email: { contains: q } }],
          }
        : { id: "__none__" };

  const [clients, users, reminders, requests] = await Promise.all([
    prisma.client.findMany({
      where: {
        ...scope,
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { contact: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      take: 8,
      select: { id: true, slug: true, name: true, contact: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.appUserAccount.findMany({
      where: userSearchWhere,
      take: 6,
      select: { id: true, username: true, email: true, role: true },
      orderBy: { username: "asc" },
    }),
    prisma.maintenanceReminder.findMany({
      where: {
        OR: [{ title: { contains: q } }, { client: { name: { contains: q } } }],
        client: { ownerUsername: owner ?? "__portal_no_owner__" },
      },
      take: 8,
      include: { client: { select: { id: true, slug: true, name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.serviceRequest.findMany({
      where: {
        ownerUsername: owner ?? "__portal_no_owner__",
        OR: [{ title: { contains: q } }, { description: { contains: q } }],
      },
      take: 8,
      include: { client: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const items: SearchItem[] = [
    ...clients.map((c) => ({
      id: `client-${c.id}`,
      type: "client" as const,
      label: c.name,
      href: `/portal/stranke/${encodeURIComponent(c.slug || c.id)}`,
      meta: c.contact || c.phone || undefined,
    })),
    ...users.map((u) => ({
      id: `user-${u.id}`,
      type: "user" as const,
      label: u.username,
      href: "/portal/nastavitve",
      meta: `${u.role}${u.email ? ` · ${u.email}` : ""}`,
    })),
    ...reminders.map((r) => ({
      id: `reminder-${r.id}`,
      type: "reminder" as const,
      label: r.title,
      href: "/portal/opomniki",
      meta: `${r.client.name} · ${r.dueDate}`,
    })),
    ...requests.map((r) => ({
      id: `request-${r.id}`,
      type: "request" as const,
      label: r.title,
      href: "/portal/zahtevki",
      meta: `${r.client?.name ?? "Brez stranke"} · ${r.priority}`,
    })),
  ].slice(0, 16);

  return NextResponse.json({ items });
}
