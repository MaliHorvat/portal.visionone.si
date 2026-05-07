import { NextResponse } from "next/server";
import { prisma, isDbConfigured } from "@/lib/db";
import { jsonError, requirePortalSession } from "@/lib/api-guard";

export async function POST(request: Request) {
  const guard = await requirePortalSession();
  if (guard) return guard;
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 500);
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return jsonError("Manjka id bota.");
  const bot = await prisma.telegramBot.findUnique({ where: { id } });
  if (!bot) return jsonError("Bot ne obstaja.", 404);
  const text = `VisionOne test obvestilo (${new Date().toLocaleString("sl-SI")})`;
  const res = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: bot.chatId, text }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return jsonError(`Pošiljanje ni uspelo: ${res.status} ${t}`, 500);
  }
  return NextResponse.json({ ok: true });
}
