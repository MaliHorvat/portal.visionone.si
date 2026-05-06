import { prisma, isDbConfigured } from "@/lib/db";
import { appendAuditLog } from "@/lib/repositories/audit-log";
import { jsonError } from "@/lib/api-guard";
import { requireEspIngestAuth } from "@/lib/esp-ingest-token";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = requireEspIngestAuth(request);
  if (auth) return auth;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  const { id } = await ctx.params;

  const body = (await request.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: unknown;
    error?: string;
    agentId?: string;
  };

  const job = await prisma.agentJob.findUnique({
    where: { id },
    include: { agent: { select: { externalId: true } } },
  });
  if (!job) return jsonError("Job ne obstaja.", 404);
  if (body.agentId && body.agentId !== job.agent.externalId) return jsonError("Napačen agent.", 403);

  const ok = Boolean(body.ok);
  const updated = await prisma.agentJob.update({
    where: { id },
    data: {
      status: ok ? "done" : "error",
      result: body.result as object | undefined,
      errorText: String(body.error ?? ""),
      finishedAt: new Date(),
    },
  });
  await prisma.telemetryAgent.update({
    where: { id: job.agentId },
    data: { lastError: ok ? "" : String(body.error ?? "") },
  });

  await appendAuditLog("agent", "agent_job_finish", `${job.agent.externalId}|${job.type}|${updated.status}`);
  return Response.json({ ok: true });
}
