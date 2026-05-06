import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import {
  isPortalSessionCookieValid,
  verifyPortalSessionToken,
  type PortalSessionPayload,
} from "@/lib/portal-session-verify";
import type { PortalUserRole } from "@/lib/portal-roles";

export async function requirePortalSession(): Promise<NextResponse | null> {
  const store = await cookies();
  const value = store.get(PORTAL_SESSION_COOKIE)?.value;
  if (!(await isPortalSessionCookieValid(value))) {
    return NextResponse.json({ error: "Neavtorizirano" }, { status: 401 });
  }
  return null;
}

export async function getPortalSessionPayload(): Promise<PortalSessionPayload | null> {
  const store = await cookies();
  const value = store.get(PORTAL_SESSION_COOKIE)?.value;
  if (!value || !value.startsWith("v2.")) return null;
  return verifyPortalSessionToken(value);
}

export async function requirePortalRole(...roles: PortalUserRole[]): Promise<NextResponse | null> {
  const payload = await getPortalSessionPayload();
  if (!payload) return NextResponse.json({ error: "Neavtorizirano" }, { status: 401 });
  if (roles.length > 0 && !roles.includes(payload.role)) {
    return NextResponse.json({ error: "Prepovedano" }, { status: 403 });
  }
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
