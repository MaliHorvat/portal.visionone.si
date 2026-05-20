import { isDbConfigured, prisma } from "@/lib/db";

function truncate(text: string, max = 3800) {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

/** Če bot nima pravil, pošlji kot doslej. Če ima, pošlji samo če je dogodek omogočen. */
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
        const rule = b.rules.find((r) => r.eventKey === eventKey);
        if (!rule || !rule.enabled) return Promise.resolve();
      }
      return fetch(`https://api.telegram.org/bot${b.token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: b.chatId, text }),
      });
    }),
  );
}

