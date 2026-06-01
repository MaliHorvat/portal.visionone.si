import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-guard";
import { prisma, isDbConfigured } from "@/lib/db";
import { sendTelegramNotification } from "@/lib/telegram-notify";

function todayIsoDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Cron: ?secret=CRON_SECRET&type=weekly|daily (privzeto weekly) */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const q = new URL(request.url).searchParams;
  if (!secret || q.get("secret") !== secret) return jsonError("Prepovedano.", 401);
  if (!isDbConfigured() || !prisma) return jsonError("DB ni nastavljena.", 503);

  const type = q.get("type") === "daily" ? "daily" : "weekly";

  try {
    if (type === "weekly") {
      const clients = await prisma.client.count();
      const openReq = await prisma.serviceRequest.count({ where: { status: { not: "done" } } });
      const urgentReq = await prisma.serviceRequest.count({
        where: { status: { not: "done" }, priority: { in: ["urgent", "high"] } },
      });
      const msg = `📊 VisionOne — tedenski povzetek\nStranke: ${clients}\nOdprti zahtevki: ${openReq}\nVisoka / nujna prioriteta: ${urgentReq}\nČas: ${new Date().toLocaleString("sl-SI")}`;
      await sendTelegramNotification(msg, "weekly_digest");
    } else {
      const today = todayIsoDate();
      const overdueReminders = await prisma.maintenanceReminder.findMany({
        where: { completed: false, dueDate: { lte: today } },
        include: { client: { select: { name: true } } },
        take: 15,
        orderBy: { dueDate: "asc" },
      });
      const offlineDevices = await prisma.deviceProbe.count({ where: { status: "offline" } });
      const offlineCameras = await prisma.clientCamera.count({ where: { status: "offline" } });

      let msg = `📅 VisionOne — dnevni povzetek\nZapadli / današnji opomniki: ${overdueReminders.length}\nKamere offline: ${offlineCameras}\nAgent naprave offline: ${offlineDevices}`;
      if (overdueReminders.length > 0) {
        const lines = overdueReminders
          .slice(0, 8)
          .map((r) => `• ${r.client.name}: ${r.title} (${r.dueDate})`);
        msg += `\n\n${lines.join("\n")}`;
        if (overdueReminders.length > 8) msg += `\n… +${overdueReminders.length - 8}`;
      }

      await sendTelegramNotification(msg, "daily_digest");

      if (overdueReminders.length > 0) {
        for (const r of overdueReminders.slice(0, 5)) {
          void sendTelegramNotification(
            `⏰ Opomnik\n${r.client.name}\n${r.title}\nRok: ${r.dueDate}`,
            "reminder_overdue",
          );
        }
      }
    }

    return NextResponse.json({ ok: true, type });
  } catch (e) {
    console.error(e);
    return jsonError("Napaka.", 500);
  }
}
