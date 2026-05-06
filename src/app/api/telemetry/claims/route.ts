import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { getPortalSessionPayload, jsonError, requirePortalRole } from "@/lib/api-guard";

function makeClaimCode() {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `VO-${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

export async function GET() {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  const claims = await prisma.agentClaimCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      client: { select: { id: true, name: true } },
      agent: { select: { id: true, externalId: true, lastSeenAt: true } },
    },
  });
  return NextResponse.json({ claims });
}

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  const body = (await request.json().catch(() => ({}))) as {
    clientId?: string;
    externalId?: string;
    name?: string;
    siteLabel?: string;
    ttlMinutes?: number;
  };

  const clientId = String(body.clientId ?? "").trim();
  const externalId = String(body.externalId ?? "").trim();
  const name = String(body.name ?? (externalId || "Raspberry Agent")).trim();
  const siteLabel = String(body.siteLabel ?? "").trim();
  const ttlMinutes = Math.max(5, Math.min(240, Number(body.ttlMinutes ?? 30) || 30));

  if (!clientId) return jsonError("Polje 'clientId' je obvezno.");
  if (!externalId) return jsonError("Polje 'externalId' je obvezno.");

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return jsonError("Stranka ne obstaja.", 404);

  const claim = await prisma.agentClaimCode.create({
    data: {
      code: makeClaimCode(),
      externalId,
      name,
      siteLabel: siteLabel || client.name,
      clientId,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      createdBy: (await getPortalSessionPayload())?.username ?? "admin",
    },
    include: { client: { select: { id: true, name: true } } },
  });

  await appendAuditLog(claim.createdBy, "agent_claim_create", `${claim.externalId} -> ${claim.clientId}`);

  return NextResponse.json({ claim }, { status: 201 });
}
