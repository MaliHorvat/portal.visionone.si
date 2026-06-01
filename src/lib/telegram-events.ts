/** Katalog Telegram dogodkov — UI oznake + privzeto stanje za nove pravila. */

export type TelegramEventDef = {
  key: string;
  label: string;
  description: string;
  category: "zahtevki" | "opomniki" | "naprave" | "portal" | "povzetki";
  defaultEnabled: boolean;
};

export const TELEGRAM_EVENTS: TelegramEventDef[] = [
  {
    key: "service_request",
    label: "Nov zahtevek",
    description: "Ko se v portalu ustvari nov servisni zahtevek.",
    category: "zahtevki",
    defaultEnabled: true,
  },
  {
    key: "service_request_update",
    label: "Posodobljen zahtevek",
    description: "Sprememba statusa, prioritete ali vsebine obstoječega zahtevka.",
    category: "zahtevki",
    defaultEnabled: false,
  },
  {
    key: "service_request_done",
    label: "Zahtevek zaključen",
    description: "Ko je status zahtevka nastavljen na opravljeno.",
    category: "zahtevki",
    defaultEnabled: true,
  },
  {
    key: "service_request_urgent",
    label: "Nujen / visok prioritetni zahtevek",
    description: "Nov zahtevek s prioriteto visoka ali nujna.",
    category: "zahtevki",
    defaultEnabled: true,
  },
  {
    key: "reminder",
    label: "Nov opomnik",
    description: "Nov vzdrževalni ali ročni opomnik pri stranki.",
    category: "opomniki",
    defaultEnabled: true,
  },
  {
    key: "reminder_updated",
    label: "Posodobljen opomnik",
    description: "Sprememba roka, tipa ali stanja opomnika.",
    category: "opomniki",
    defaultEnabled: false,
  },
  {
    key: "reminder_overdue",
    label: "Zapadel ali današnji opomnik",
    description: "Dnevno obvestilo za odprte opomnike z rokom danes ali v preteklosti.",
    category: "opomniki",
    defaultEnabled: true,
  },
  {
    key: "device_offline",
    label: "Naprava offline (Care Box / agent)",
    description: "Prehod naprave v offline prek telemetrije agenta.",
    category: "naprave",
    defaultEnabled: true,
  },
  {
    key: "device_online",
    label: "Naprava spet online (agent)",
    description: "Naprava je po prejšnjem offline spet dosegljiva.",
    category: "naprave",
    defaultEnabled: false,
  },
  {
    key: "camera_offline",
    label: "Kamera offline (preverjanje v portalu)",
    description: "Kamera stranke po TCP/RTSP preveri ni dosegljiva.",
    category: "naprave",
    defaultEnabled: true,
  },
  {
    key: "camera_online",
    label: "Kamera spet online",
    description: "Kamera je po prejšnjem offline spet dosegljiva.",
    category: "naprave",
    defaultEnabled: false,
  },
  {
    key: "portal_access_request",
    label: "Zahteva za dostop do portala",
    description: "Nov uporabnik zaprosi za dostop prek Clerk prijave.",
    category: "portal",
    defaultEnabled: true,
  },
  {
    key: "client_new",
    label: "Nova stranka / objekt",
    description: "Dodana nova stranka v šifrant objektov.",
    category: "portal",
    defaultEnabled: false,
  },
  {
    key: "weekly_digest",
    label: "Tedenski povzetek",
    description: "Skupno število strank in odprtih zahtevkov (cron).",
    category: "povzetki",
    defaultEnabled: true,
  },
  {
    key: "daily_digest",
    label: "Dnevni povzetek",
    description: "Zapeli opomniki in število offline naprav (cron).",
    category: "povzetki",
    defaultEnabled: false,
  },
];

export const TELEGRAM_EVENT_KEYS = TELEGRAM_EVENTS.map((e) => e.key);

const EVENT_MAP = new Map(TELEGRAM_EVENTS.map((e) => [e.key, e]));

export function getTelegramEventDef(key: string): TelegramEventDef | undefined {
  return EVENT_MAP.get(key);
}

export function getTelegramEventLabel(key: string): string {
  return getTelegramEventDef(key)?.label ?? key;
}

export const TELEGRAM_EVENT_CATEGORIES: Record<
  TelegramEventDef["category"],
  { title: string }
> = {
  zahtevki: { title: "Zahtevki" },
  opomniki: { title: "Opomniki" },
  naprave: { title: "Naprave & monitoring" },
  portal: { title: "Portal & stranke" },
  povzetki: { title: "Povzetki (cron)" },
};

/** Ali je dogodek omogočen za bota (z legacy združljivostjo). */
export function isRuleEnabledForEvent(
  rules: Array<{ eventKey: string; enabled: boolean }>,
  eventKey: string,
): boolean {
  if (rules.length === 0) return true;
  const direct = rules.find((r) => r.eventKey === eventKey);
  if (direct) return direct.enabled;
  if (eventKey === "service_request_update" || eventKey === "service_request_done") {
    const legacy = rules.find((r) => r.eventKey === "service_request");
    if (legacy?.enabled) return true;
  }
  if (eventKey === "reminder_updated") {
    const legacy = rules.find((r) => r.eventKey === "reminder");
    if (legacy?.enabled) return true;
  }
  return false;
}
