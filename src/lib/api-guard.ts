import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";
import { isPortalSessionCookieValid } from "@/lib/portal-session-verify";

export async function requirePortalSession(): Promise<NextResponse | null> {
  const store = await cookies();
  const value = store.get(PORTAL_SESSION_COOKIE)?.value;
  if (!(await isPortalSessionCookieValid(value))) {
    return NextResponse.json({ error: "Neavtorizirano" }, { status: 401 });
  }
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
