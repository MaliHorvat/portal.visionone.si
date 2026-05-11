import { isDbConfigured, prisma } from "@/lib/db";

function truncate(text: string, max = 3800) {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

export async function sendTelegramNotification(message: string) {
  if (!isDbConfigured() || !prisma) return;
  const bots = await prisma.telegramBot.findMany({ select: { token: true, chatId: true } });
  if (bots.length === 0) return;
  const text = truncate(message.trim());
  await Promise.allSettled(
    bots.map((b) =>
      fetch(`https://api.telegram.org/bot${b.token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: b.chatId, text }),
      }),
    ),
  );
}

