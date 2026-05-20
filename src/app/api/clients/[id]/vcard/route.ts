import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { getPortalSession } from "@/lib/get-portal-session";
import { getClientForSession } from "@/lib/repositories/clients";

type Ctx = { params: Promise<{ id: string }> };

function vcardEscape(s: string) {
  return s.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,");
}

export async function GET(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  try {
    const session = await getPortalSession();
    const { id } = await ctx.params;
    const c = await getClientForSession(id, session ?? undefined);
    if (!c) return jsonError("Stranka ne obstaja.", 404);
    const fn = vcardEscape(c.contact || c.name);
    const org = vcardEscape(c.name);
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${fn}`,
      `ORG:${org}`,
      c.phone ? `TEL;TYPE=CELL:${vcardEscape(c.phone)}` : "",
      c.email ? `EMAIL:${vcardEscape(c.email)}` : "",
      c.address ? `ADR;TYPE=WORK:;;${vcardEscape(c.address)};;;;` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");
    return new NextResponse(lines, {
      headers: {
        "content-type": "text/vcard; charset=utf-8",
        "content-disposition": `attachment; filename="visionone-${c.slug ?? c.id}.vcf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
