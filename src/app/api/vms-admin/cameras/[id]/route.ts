import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { deleteVmsCamera, updateVmsCamera } from "@/lib/repositories/vms-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      channel?: number | string;
      ip?: string;
      rtspUrl?: string;
      model?: string;
      enabled?: boolean;
    };
    const channel = body.channel !== undefined ? Number(body.channel) : undefined;
    if (channel !== undefined && (!Number.isFinite(channel) || channel < 1)) {
      return jsonError("Kanal kamere je neveljaven.");
    }
    const camera = await updateVmsCamera(id, {
      name: body.name,
      channel,
      ip: body.ip,
      rtspUrl: body.rtspUrl,
      model: body.model,
      enabled: body.enabled,
    });
    return NextResponse.json({ camera });
  } catch (err) {
    console.error("[vms-admin] update camera failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri urejanju VMS kamere.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    await deleteVmsCamera(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[vms-admin] delete camera failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri brisanju VMS kamere.", 500);
  }
}
