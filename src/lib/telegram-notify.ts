import { isDbConfigured, prisma } from "@/lib/db";
import { isRuleEnabledForEvent } from "@/lib/telegram-events";

function truncate(text: string, max = 3800) {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

/** Pošlji vsem botom, kjer je dogodek vklopljen (ali brez pravil — kot doslej). */
export async function sendTelegramNotification(message: string, eventKey?: string) {
  if (!isDbConfigured() || !prisma) return;
  const bots = await prisma.telegramBot.findMany({
    include: { rules: true },
  });
  if (bots.length === 0) return;
  const text = truncate(message.trim());
  await Promise.allSettled(
    bots.map((b) => {
      if (eventKey && b.rules.length > 0) {
        if (!isRuleEnabledForEvent(b.rules, eventKey)) return Promise.resolve();
      }
      return fetch(`https://api.telegram.org/bot${b.token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: b.chatId, text }),
      });
    }),
  );
}
