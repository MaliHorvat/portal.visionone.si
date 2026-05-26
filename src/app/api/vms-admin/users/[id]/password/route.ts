import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { resetVmsUserPassword } from "@/lib/repositories/vms-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const password = String(body.password ?? "");
    if (password.length < 8) return jsonError("Geslo mora imeti vsaj 8 znakov.");
    const user = await resetVmsUserPassword(id, password);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error("[vms-admin] reset user password failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri resetu gesla.", 500);
  }
}
