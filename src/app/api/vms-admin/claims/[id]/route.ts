import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { deleteVmsGatewayClaim } from "@/lib/repositories/vms-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    await deleteVmsGatewayClaim(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[vms-admin] delete claim failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri brisanju gateway claim kode.", 500);
  }
}
