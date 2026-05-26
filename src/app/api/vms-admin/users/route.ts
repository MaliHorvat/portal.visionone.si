import { NextResponse } from "next/server";
import { jsonError, requirePortalRole } from "@/lib/api-guard";
import { createVmsUser } from "@/lib/repositories/vms-admin";
import type { VmsUserRole } from "@/generated/vms-prisma";

function toRole(value: unknown): VmsUserRole {
  const role = String(value ?? "viewer");
  return role === "owner" || role === "admin" || role === "viewer" ? role : "viewer";
}

export async function POST(request: Request) {
  const guard = await requirePortalRole("admin");
  if (guard) return guard;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      customerId?: string;
      email?: string;
      name?: string;
      password?: string;
      role?: string;
    };
    const customerId = String(body.customerId ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!customerId) return jsonError("VMS stranka je obvezna.");
    if (!email) return jsonError("Email je obvezen.");
    if (password.length < 8) return jsonError("Geslo mora imeti vsaj 8 znakov.");
    const user = await createVmsUser(customerId, { email, name: body.name, password, role: toRole(body.role) });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { status: 201 });
  } catch (err) {
    console.error("[vms-admin] create user failed:", err);
    return jsonError(err instanceof Error ? err.message : "Napaka pri ustvarjanju VMS uporabnika.", 500);
  }
}
