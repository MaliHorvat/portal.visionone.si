import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { appendAuditLog } from "@/lib/repositories/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const token = String(body?.token ?? "").trim();
    const chatId = String(body?.chatId ?? "").trim();
    if (!name || !token || !chatId) return jsonError("Ime, token in chatId so obvezni.");
    const bot = await prisma.telegramBot.update({
      where: { id },
      data: { name, token, chatId },
    });
    await appendAuditLog("admin", "telegram_bot_update", id);
    return NextResponse.json({ bot });
  } catch {
    return jsonError("Bot ne obstaja.", 404);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const { id } = await ctx.params;
    await prisma.telegramBot.delete({ where: { id } });
    await appendAuditLog("admin", "telegram_bot_delete", id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Bot ne obstaja.", 404);
  }
}
