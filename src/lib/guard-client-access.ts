import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import type { PortalSessionPayload } from "@/lib/portal-session-verify";
import { assertClientOwnedBySession } from "@/lib/repositories/clients";

export type OwnedClientGuard =
  | { ok: true; session: PortalSessionPayload }
  | { ok: false; response: NextResponse };

/** Po `requirePortalSession`: preveri, da stranka pripada trenutnemu uporabniku (tenant). */
export async function requireOwnedClient(clientId: string): Promise<OwnedClientGuard> {
  const session = await getPortalSession();
  if (!session?.username?.trim()) return { ok: false, response: jsonError("Seja ni veljavna.", 401) };
  if (!(await assertClientOwnedBySession(clientId, session))) {
    return { ok: false, response: jsonError("Stranka ne obstaja.", 404) };
  }
  return { ok: true, session };
}
