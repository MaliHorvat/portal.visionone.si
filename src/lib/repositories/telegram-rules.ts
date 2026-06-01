import { prisma, isDbConfigured } from "@/lib/db";
import { TELEGRAM_EVENT_KEYS, getTelegramEventDef } from "@/lib/telegram-events";

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export async function listRulesForBot(botId: string) {
  requireDb();
  return prisma!.telegramNotificationRule.findMany({ where: { botId }, orderBy: { eventKey: "asc" } });
}

/** Doda manjkajoča pravila; obstoječa ne spreminja. */
export async function ensureDefaultRulesForBot(botId: string) {
  requireDb();
  const existing = await prisma!.telegramNotificationRule.findMany({ where: { botId } });
  const have = new Set(existing.map((r) => r.eventKey));
  const missing = TELEGRAM_EVENT_KEYS.filter((k) => !have.has(k));
  if (missing.length > 0) {
    await prisma!.telegramNotificationRule.createMany({
      data: missing.map((eventKey) => ({
        botId,
        eventKey,
        enabled: getTelegramEventDef(eventKey)?.defaultEnabled ?? false,
      })),
    });
  }
  return prisma!.telegramNotificationRule.findMany({
    where: { botId },
    orderBy: { eventKey: "asc" },
  });
}

export async function setRuleEnabled(botId: string, eventKey: string, enabled: boolean) {
  requireDb();
  await prisma!.telegramNotificationRule.upsert({
    where: { botId_eventKey: { botId, eventKey } },
    create: { botId, eventKey, enabled },
    update: { enabled },
  });
}

export async function isEventEnabledForAnyBot(eventKey: string): Promise<boolean> {
  if (!isDbConfigured() || !prisma) return true;
  const row = await prisma!.telegramNotificationRule.findFirst({
    where: { eventKey, enabled: true },
  });
  if (!row) {
    const bots = await prisma!.telegramBot.findMany({ take: 1 });
    return bots.length === 0;
  }
  return true;
}
