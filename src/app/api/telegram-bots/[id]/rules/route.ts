import { NextResponse } from "next/server";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { setRuleEnabled } from "@/lib/repositories/telegram-rules";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!prisma) return jsonError("DB ni nastavljena.", 503);
  try {
    const { id: botId } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      eventKey?: string;
      enabled?: boolean;
    };
    const eventKey = String(body?.eventKey ?? "");
    if (!eventKey) return jsonError("Manjka eventKey.");
    await setRuleEnabled(botId, eventKey, Boolean(body?.enabled));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
