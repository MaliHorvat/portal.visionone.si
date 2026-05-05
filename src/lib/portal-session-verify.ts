import { LEGACY_PORTAL_SESSION_VALUE } from "@/lib/portal-auth";
import { getPortalSessionSecret } from "@/lib/portal-session-secret";

export type PortalSessionPayload = {
  username: string;
  isAdmin: boolean;
  /** UNIX sekunde */
  exp: number;
};

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

function bytesToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(b64url: string): string {
  const pad = b64url.length % 4;
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + (pad ? "=".repeat(4 - pad) : "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Preveri žeton (Edge middleware + Node route/layout). Brez Node `crypto` modula. */
export async function verifyPortalSessionToken(
  token: string,
  secret = getPortalSessionSecret(),
): Promise<PortalSessionPayload | null> {
  if (!token.startsWith("v2.")) return null;
  const rest = token.slice(3);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);

  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const macUrl = bytesToBase64Url(mac);
  if (!timingSafeEqualStr(macUrl, sig)) return null;

  let parsed: PortalSessionPayload;
  try {
    parsed = JSON.parse(base64UrlToUtf8(body)) as PortalSessionPayload;
  } catch {
    return null;
  }
  if (
    typeof parsed.username !== "string" ||
    typeof parsed.isAdmin !== "boolean" ||
    typeof parsed.exp !== "number"
  ) {
    return null;
  }
  if (Math.floor(Date.now() / 1000) >= parsed.exp) return null;
  return parsed;
}

/** Middleware / API: zastareli piškotek ali podpisani žeton `v2.*`. */
export async function isPortalSessionCookieValid(cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  if (cookie === LEGACY_PORTAL_SESSION_VALUE) return true;
  try {
    const p = await verifyPortalSessionToken(cookie);
    return p !== null;
  } catch {
    return false;
  }
}
