import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { updateVmsCustomer } from "@/lib/repositories/vms-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      slug?: string;
      contact?: string;
      email?: string;
      phone?: string;
      planId?: string;
    };
    const customer = await updateVmsCustomer(id, body);
    return NextResponse.json({ customer });
  } catch (err) {
    console.error("[vms-admin] update customer failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri urejanju VMS stranke.", 500);
  }
}
