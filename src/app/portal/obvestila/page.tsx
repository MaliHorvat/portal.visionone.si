"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";
import {
  TELEGRAM_EVENT_CATEGORIES,
  TELEGRAM_EVENTS,
  type TelegramEventDef,
} from "@/lib/telegram-events";

type RuleRow = { id: string; eventKey: string; enabled: boolean };
type BotRow = {
  id: string;
  name: string;
  token: string;
  chatId: string;
  rules?: RuleRow[];
};

const CATEGORY_ORDER: TelegramEventDef["category"][] = [
  "zahtevki",
  "opomniki",
  "naprave",
  "portal",
  "povzetki",
];

export default function ObvestilaPage() {
  const [bots, setBots] = useState<BotRow[]>([]);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/telegram-bots", { credentials: "include" });
    const data = (await res.json()) as { bots?: BotRow[] };
    setBots(data.bots ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const rulesByKey = useMemo(() => {
    const map = new Map<string, Map<string, boolean>>();
    for (const b of bots) {
      const inner = new Map<string, boolean>();
      for (const r of b.rules ?? []) inner.set(r.eventKey, r.enabled);
      map.set(b.id, inner);
    }
    return map;
  }, [bots]);

  function startEdit(b: BotRow) {
    setEditingId(b.id);
    setName(b.name);
    setToken(b.token);
    setChatId(b.chatId);
    setMsg(null);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setToken("");
    setChatId("");
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const url = editingId ? `/api/telegram-bots/${editingId}` : "/api/telegram-bots";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, token, chatId }),
    });
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(errBody.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    resetForm();
    await load();
    setMsg(editingId ? "Bot posodobljen." : "Bot dodan — pravila so samodejno ustvarjena.");
  }

  async function onDelete(id: string) {
    if (!confirm("Izbrisati bota?")) return;
    await fetch(`/api/telegram-bots/${id}`, { method: "DELETE", credentials: "include" });
    if (editingId === id) resetForm();
    await load();
  }

  async function toggleRule(botId: string, eventKey: string, enabled: boolean) {
    setMsg(null);
    const res = await fetch(`/api/telegram-bots/${botId}/rules`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventKey, enabled }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(data.error ?? "Posodobitev pravila ni uspela.");
      return;
    }
    await load();
  }

  async function setAllRules(botId: string, enabled: boolean) {
    for (const ev of TELEGRAM_EVENTS) {
      await fetch(`/api/telegram-bots/${botId}/rules`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventKey: ev.key, enabled }),
      });
    }
    await load();
    setMsg(enabled ? "Vsa obvestila vklopljena." : "Vsa obvestila izklopljena.");
  }

  async function sendTest(id: string) {
    setMsg(null);
    const res = await fetch("/api/telegram-bots/test", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Test pošiljanje ni uspelo.");
      return;
    }
    setMsg("Test obvestilo poslano.");
  }

  return (
    <AdminGate>
      <div className="mx-auto max-w-3xl space-y-6 pb-[env(safe-area-inset-bottom)]">
        <div>
          <h1 className="vo-page-title text-xl sm:text-2xl">Obvestila — Telegram</h1>
          <p className="vo-page-desc mt-1 text-sm">
            Izberite, katera obvestila naj bot pošilja v skupinski klepet. Ob odprtju strani se dodajo nova pravila;
            obstoječa nastavitev ostane nespremenjena.
          </p>
        </div>

        <form onSubmit={onSave} className="vo-tool-section space-y-4">
          {editingId ? <p className="text-xs font-medium text-[var(--vo-accent)]">Urejanje bota</p> : null}
          <label className="block text-sm">
            <span className="vo-field-label">Ime bota</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="vo-input vo-input-touch mt-1 w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="vo-field-label">Bot API žeton</span>
            <input
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="vo-input vo-input-touch mt-1 w-full font-mono text-sm"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="vo-field-label">Chat ID</span>
            <input
              required
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="vo-input vo-input-touch mt-1 w-full font-mono text-sm"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="vo-touch-btn vo-btn-primary flex-1 px-4 py-2.5 text-sm font-semibold">
              {editingId ? "Shrani spremembe" : "Dodaj bota"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="vo-touch-btn vo-btn-secondary px-4 py-2.5 text-sm">
                Prekliči
              </button>
            ) : null}
          </div>
          {msg ? (
            <p className={`text-sm ${msg.includes("ni uspel") ? "text-[var(--vo-danger)]" : "text-[var(--vo-ok)]"}`}>
              {msg}
            </p>
          ) : null}
        </form>

        <section className="vo-tool-section">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Vrste obvestil</h2>
          <div className="mt-3 space-y-4">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat}>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--vo-accent)]">
                  {TELEGRAM_EVENT_CATEGORIES[cat].title}
                </h3>
                <ul className="mt-2 space-y-2">
                  {TELEGRAM_EVENTS.filter((e) => e.category === cat).map((ev) => (
                    <li key={ev.key} className="text-xs text-[var(--vo-muted)]">
                      <span className="font-medium text-[var(--vo-fg)]">{ev.label}</span>
                      <span className="ml-1 text-[var(--vo-muted)]">— {ev.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--vo-muted)]">
            Dnevni/tedenski povzetek: cron URL z <code className="font-mono">?secret=…&type=daily</code> ali{" "}
            <code className="font-mono">type=weekly</code>.
          </p>
        </section>

        {loading ? (
          <p className="text-sm text-[var(--vo-muted)]">Nalagam bote…</p>
        ) : null}

        {!loading && bots.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Obstoječi boti</h2>
            {bots.map((b) => (
              <article key={b.id} className="vo-tool-section">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--vo-fg)]">{b.name}</span>
                  <span className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-emerald-500 hover:underline"
                      onClick={() => void sendTest(b.id)}
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--vo-accent)] hover:underline"
                      onClick={() => startEdit(b)}
                    >
                      Uredi
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--vo-danger)] hover:underline"
                      onClick={() => void onDelete(b.id)}
                    >
                      Briši
                    </button>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--vo-border)] px-2 py-1 text-xs hover:bg-[var(--vo-surface-2)]"
                    onClick={() => void setAllRules(b.id, true)}
                  >
                    Vklopi vse
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--vo-border)] px-2 py-1 text-xs hover:bg-[var(--vo-surface-2)]"
                    onClick={() => void setAllRules(b.id, false)}
                  >
                    Izklopi vse
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {CATEGORY_ORDER.map((cat) => {
                    const events = TELEGRAM_EVENTS.filter((e) => e.category === cat);
                    if (events.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="mb-2 text-xs font-semibold text-[var(--vo-muted)]">
                          {TELEGRAM_EVENT_CATEGORIES[cat].title}
                        </p>
                        <ul className="space-y-2">
                          {events.map((ev) => {
                            const enabled = rulesByKey.get(b.id)?.get(ev.key) ?? false;
                            const hasRule = rulesByKey.get(b.id)?.has(ev.key);
                            return (
                              <li
                                key={ev.key}
                                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--vo-fg)]">{ev.label}</p>
                                  <p className="mt-0.5 text-xs text-[var(--vo-muted)]">{ev.description}</p>
                                  {!hasRule ? (
                                    <p className="mt-1 text-xs text-[var(--vo-warn)]">Shrani bota za novo pravilo</p>
                                  ) : null}
                                </div>
                                <label className="flex shrink-0 items-center gap-2 pt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => void toggleRule(b.id, ev.key, e.target.checked)}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-xs text-[var(--vo-muted)]">{enabled ? "Da" : "Ne"}</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && bots.length === 0 ? (
          <p className="text-sm text-[var(--vo-muted)]">Še ni botov — dodajte bota zgoraj.</p>
        ) : null}
      </div>
    </AdminGate>
  );
}
