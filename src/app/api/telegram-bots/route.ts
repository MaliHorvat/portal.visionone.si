import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";
import { appendAuditLog } from "@/lib/repositories/audit-log";

export async function GET() {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const bots = await prisma.telegramBot.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ bots });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri branju botov.", 500);
  }
}

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const token = String(body?.token ?? "").trim();
    const chatId = String(body?.chatId ?? "").trim();
    if (!name || !token || !chatId) return jsonError("Ime, token in chatId so obvezni.");
    const bot = await prisma.telegramBot.create({ data: { name, token, chatId } });
    await appendAuditLog("admin", "telegram_bot_create", name);
    return NextResponse.json({ bot }, { status: 201 });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka pri ustvarjanju bota.", 500);
  }
}
