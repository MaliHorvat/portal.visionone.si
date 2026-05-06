import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError } from "@/lib/api-guard";
import { requireEspIngestAuth } from "@/lib/esp-ingest-token";

export async function GET(request: Request) {
  const auth = requireEspIngestAuth(request);
  if (auth) return auth;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);

  const url = new URL(request.url);
  const externalId = url.searchParams.get("agentId")?.trim() ?? "";
  if (!externalId) return jsonError("Query parameter 'agentId' je obvezen.");

  const agent = await prisma.telemetryAgent.findUnique({ where: { externalId } });
  if (!agent) return jsonError("Agent ni registriran.", 404);

  return Response.json({
    ok: true,
    config: {
      token: process.env.ESP_INGEST_TOKEN ?? "",
      interval_seconds: 60,
      request_timeout_seconds: 8,
      targets_refresh_every: 5,
      jobs_poll_every: 1,
      max_retry_backoff_seconds: 120,
      config_version: agent.configVersion,
      site_label: agent.siteLabel,
      agent_name: agent.name,
      client_id: agent.clientId,
    },
  });
}
