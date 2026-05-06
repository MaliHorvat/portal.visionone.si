import { AgentJobType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { getPortalSessionPayload, jsonError, requirePortalRole } from "@/lib/api-guard";

export async function GET(request: Request) {
  const guard = await requirePortalRole("admin", "operator", "viewer");
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId")?.trim() ?? "";
  const take = Math.max(1, Math.min(100, Number(url.searchParams.get("take") ?? 30) || 30));
  const jobs = await prisma.agentJob.findMany({
    where: agentId ? { agentId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    include: { agent: { select: { id: true, externalId: true, name: true } } },
  });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin", "operator");
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  const session = await getPortalSessionPayload();

  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    type?: string;
    payload?: Record<string, unknown>;
  };
  const agentId = String(body.agentId ?? "").trim();
  const type = String(body.type ?? "").trim() as AgentJobType;
  const payload = (body.payload ?? {}) as Prisma.InputJsonValue;
  if (!agentId) return jsonError("Polje 'agentId' je obvezno.");
  if (type !== "ping" && type !== "scan") return jsonError("Neveljaven tip posla.");

  const agent = await prisma.telemetryAgent.findUnique({ where: { id: agentId } });
  if (!agent) return jsonError("Agent ne obstaja.", 404);

  const job = await prisma.agentJob.create({
    data: {
      agentId,
      clientId: agent.clientId,
      type,
      payload,
      createdBy: session?.username ?? "admin",
    },
  });
  await appendAuditLog(session?.username ?? "admin", "agent_job_create", `${type} -> ${agent.externalId}`);
  return NextResponse.json({ job }, { status: 201 });
}
