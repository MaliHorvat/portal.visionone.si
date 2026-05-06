import { cookies } from "next/headers";
import {
  DEFAULT_PORTAL_USERNAME,
  LEGACY_PORTAL_SESSION_VALUE,
  PORTAL_SESSION_COOKIE,
} from "@/lib/portal-auth";
import { getPortalSessionSecret } from "@/lib/portal-session-secret";
import { verifyPortalSessionToken, type PortalSessionPayload } from "@/lib/portal-session-verify";

/** Beri sejo iz piškotka (strežniške komponente in route handlerji). */
export async function getPortalSession(): Promise<PortalSessionPayload | null> {
  const raw = (await cookies()).get(PORTAL_SESSION_COOKIE)?.value;
  if (!raw) return null;
  if (raw === LEGACY_PORTAL_SESSION_VALUE) {
    return {
      username: DEFAULT_PORTAL_USERNAME,
      role: "admin",
      mustChangePassword: false,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    };
  }
  try {
    return await verifyPortalSessionToken(raw, getPortalSessionSecret());
  } catch {
    return null;
  }
}
