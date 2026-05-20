import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-guard";
import { prisma, isDbConfigured } from "@/lib/db";
import { sendTelegramNotification } from "@/lib/telegram-notify";

/** Tedenski povzetek — klic z Vercel Cron ali ročno: ?secret=CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const q = new URL(request.url).searchParams.get("secret");
  if (!secret || q !== secret) return jsonError("Prepovedano.", 401);
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 503);
  try {
    const clients = await prisma.client.count();
    const openReq = await prisma.serviceRequest.count({ where: { status: { not: "done" } } });
    const msg = `📊 VisionOne tedenski povzetek\nStranke: ${clients}\nOdprti zahtevki: ${openReq}\nČas: ${new Date().toISOString()}`;
    await sendTelegramNotification(msg);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
