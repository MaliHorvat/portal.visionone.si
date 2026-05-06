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

  const jobs = await prisma.agentJob.findMany({
    where: { agentId: agent.id, status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

  if (jobs.length > 0) {
    await prisma.agentJob.updateMany({
      where: { id: { in: jobs.map((j) => j.id) }, status: "pending" },
      data: { status: "running", startedAt: new Date() },
    });
  }

  return Response.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      type: j.type,
      payload: j.payload,
      createdAt: j.createdAt,
    })),
  });
}
