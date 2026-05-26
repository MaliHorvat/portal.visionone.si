import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { deleteVmsUser, updateVmsUser } from "@/lib/repositories/vms-admin";
import type { VmsUserRole } from "@/generated/vms-prisma";

type Ctx = { params: Promise<{ id: string }> };

function toRole(value: unknown): VmsUserRole | undefined {
  if (value === undefined) return undefined;
  const role = String(value);
  return role === "owner" || role === "admin" || role === "viewer" ? role : "viewer";
}

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      name?: string;
      role?: string;
      isActive?: boolean;
    };
    const user = await updateVmsUser(id, {
      email: body.email,
      name: body.name,
      role: toRole(body.role),
      isActive: body.isActive,
    });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } });
  } catch (err) {
    console.error("[vms-admin] update user failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri urejanju VMS uporabnika.", 500);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const { id } = await ctx.params;
    await deleteVmsUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[vms-admin] delete user failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri brisanju VMS uporabnika.", 500);
  }
}
