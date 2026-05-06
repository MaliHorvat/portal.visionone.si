import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { jsonError } from "@/lib/api-guard";

export async function POST(request: Request) {
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  const body = (await request.json().catch(() => ({}))) as {
    claimCode?: string;
    agentName?: string;
    siteLabel?: string;
  };
  const claimCode = String(body.claimCode ?? "").trim().toUpperCase();
  if (!claimCode) return jsonError("Polje 'claimCode' je obvezno.");

  const claim = await prisma.agentClaimCode.findUnique({ where: { code: claimCode } });
  if (!claim) return jsonError("Claim code ni veljaven.", 404);
  if (claim.consumedAt) return jsonError("Claim code je že uporabljen.", 409);
  if (claim.expiresAt.getTime() < Date.now()) return jsonError("Claim code je potekel.", 410);

  const resolvedAgentName = String(body.agentName ?? (claim.name || claim.externalId));
  const agent = await prisma.telemetryAgent.upsert({
    where: { externalId: claim.externalId },
    create: {
      externalId: claim.externalId,
      name: resolvedAgentName,
      siteLabel: String(body.siteLabel ?? claim.siteLabel),
      clientId: claim.clientId,
      lastConfigAt: new Date(),
      configVersion: 1,
      lastError: "",
    },
    update: {
      name: resolvedAgentName,
      siteLabel: String(body.siteLabel ?? claim.siteLabel),
      clientId: claim.clientId,
      lastConfigAt: new Date(),
      configVersion: { increment: 1 },
      lastError: "",
    },
  });

  await prisma.agentClaimCode.update({
    where: { id: claim.id },
    data: { consumedAt: new Date(), agentId: agent.id },
  });

  await appendAuditLog("agent-bootstrap", "agent_claim_consume", `${claim.externalId} -> ${claim.clientId}`);

  const token = process.env.ESP_INGEST_TOKEN ?? "";
  if (!token) return jsonError("ESP_INGEST_TOKEN ni nastavljen.", 500);

  return NextResponse.json({
    ok: true,
    config: {
      portal_base_url: process.env.NEXT_PUBLIC_PORTAL_BASE_URL || new URL(request.url).origin,
      ingest_path: "/api/telemetry/ingest",
      targets_path: "/api/telemetry/targets",
      runtime_config_path: "/api/telemetry/runtime-config",
      jobs_poll_path: "/api/telemetry/jobs/poll",
      jobs_result_path_template: "/api/telemetry/jobs/{id}/result",
      token,
      agent_id: claim.externalId,
      agent_name: resolvedAgentName,
      site_label: String(body.siteLabel ?? claim.siteLabel),
      client_id: claim.clientId,
      interval_seconds: 60,
      request_timeout_seconds: 8,
      targets_refresh_every: 5,
      jobs_poll_every: 1,
      spool_file: "/var/lib/visionone-agent/spool.jsonl",
      max_retry_backoff_seconds: 120,
      config_version: agent.configVersion,
    },
  });
}
