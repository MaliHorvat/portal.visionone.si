import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { createVmsCustomer, ensureDefaultVmsPlans, listVmsAdminOverview } from "@/lib/repositories/vms-admin";

export async function GET() {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    return NextResponse.json(await listVmsAdminOverview());
  } catch (err) {
    console.error("[vms-admin] overview failed:", err);
    return jsonError("Napaka pri branju VMS podatkov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      name?: string;
      slug?: string;
      contact?: string;
      email?: string;
      phone?: string;
      planId?: string;
    };
    if (body.action === "ensure-plans") {
      await ensureDefaultVmsPlans();
      return NextResponse.json({ ok: true });
    }
    const name = String(body.name ?? "").trim();
    const planId = String(body.planId ?? "").trim();
    if (!name) return jsonError("Ime VMS stranke je obvezno.");
    if (!planId) return jsonError("Licenca je obvezna.");
    const customer = await createVmsCustomer({
      name,
      slug: body.slug,
      contact: body.contact,
      email: body.email,
      phone: body.phone,
      planId,
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error("[vms-admin] create customer failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri ustvarjanju VMS stranke.", 500);
  }
}
