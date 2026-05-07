import nodeCrypto from "crypto";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";
import { getPortalSessionSecret } from "@/lib/portal-session-secret";

/** Podpis žeton za httpOnly piškotek — samo v Node route handlerjih. */
export function signPortalSessionToken(
  payload: Omit<PortalSessionPayload, "exp"> & { maxAgeSec?: number },
  secret = getPortalSessionSecret(),
): string {
  const maxAgeSec = payload.maxAgeSec ?? 60 * 60 * 8;
  const bodyObj: PortalSessionPayload = {
    username: payload.username,
    role: payload.role,
    mustChangePassword: payload.mustChangePassword,
    navPermissions: payload.navPermissions,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const body = Buffer.from(JSON.stringify(bodyObj), "utf8").toString("base64url");
  const sig = nodeCrypto.createHmac("sha256", secret).update(body, "utf8").digest("base64url");
  return `v2.${body}.${sig}`;
}
