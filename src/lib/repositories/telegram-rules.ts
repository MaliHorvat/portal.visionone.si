import { prisma, isDbConfigured } from "@/lib/db";

const DEFAULT_EVENTS = [
  "service_request",
  "reminder",
  "device_offline",
] as const;

function requireDb() {
  if (!isDbConfigured() || !prisma) throw new Error("DB ni nastavljena.");
}

export async function listRulesForBot(botId: string) {
  requireDb();
  return prisma!.telegramNotificationRule.findMany({ where: { botId } });
}

export async function ensureDefaultRulesForBot(botId: string) {
  requireDb();
  const existing = await prisma!.telegramNotificationRule.findMany({ where: { botId } });
  if (existing.length > 0) return existing;
  await prisma!.telegramNotificationRule.createMany({
    data: DEFAULT_EVENTS.map((eventKey) => ({ botId, eventKey, enabled: true })),
  });
  return prisma!.telegramNotificationRule.findMany({ where: { botId } });
}

export async function setRuleEnabled(botId: string, eventKey: string, enabled: boolean) {
  requireDb();
  await prisma!.telegramNotificationRule.updateMany({
    where: { botId, eventKey },
    data: { enabled },
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
