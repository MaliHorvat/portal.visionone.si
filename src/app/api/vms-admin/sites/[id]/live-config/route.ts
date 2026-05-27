import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { updateVmsSiteLiveConfig } from "@/lib/repositories/vms-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      streamBaseUrl?: string;
      cameras?: Array<{ id: string; rtspUrl?: string }>;
    };
    const site = await updateVmsSiteLiveConfig(id, body);
    return NextResponse.json({ site });
  } catch (err) {
    console.error("[vms-admin] update site live config failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri shranjevanju live nastavitev.", 500);
  }
}
