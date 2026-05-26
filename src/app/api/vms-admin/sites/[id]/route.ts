import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { deleteVmsSite, updateVmsSite } from "@/lib/repositories/vms-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      address?: string;
      nvrName?: string;
      nvrIp?: string;
      nvrModel?: string;
      streamBaseUrl?: string;
    };
    const site = await updateVmsSite(id, body);
    return NextResponse.json({ site });
  } catch (err) {
    console.error("[vms-admin] update site failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri urejanju VMS objekta.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    await deleteVmsSite(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[vms-admin] delete site failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri brisanju VMS objekta.", 500);
  }
}
