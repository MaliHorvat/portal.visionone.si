import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { requireOwnedClient } from "@/lib/guard-client-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("Baza ni nastavljena.", 503);
  try {
    const { id: clientId } = await ctx.params;
    const own = await requireOwnedClient(clientId);
    if (!own.ok) return own.response;
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
    const username = own.session.username;
    const rows = await prisma.auditLog.findMany({
      where: {
        username,
        OR: [
          { details: { contains: clientId } },
          ...(client?.name ? [{ details: { contains: client.name } }] : []),
          { action: { startsWith: "client_" } },
          { action: { startsWith: "reminder_" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    });
    return NextResponse.json({
      events: rows.map((r) => ({
        id: r.id,
        at: r.createdAt.toISOString(),
        action: r.action,
        details: r.details,
        username: r.username,
      })),
    });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri nalaganju timeline.", 500);
  }
}

