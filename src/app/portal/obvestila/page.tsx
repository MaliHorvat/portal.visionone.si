"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";

type BotRow = { id: string; name: string; token: string; chatId: string };

export default function ObvestilaPage() {
  const [bots, setBots] = useState<BotRow[]>([]);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/telegram-bots", { credentials: "include" });
    const data = (await res.json()) as { bots?: BotRow[] };
    setBots(data.bots ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

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
  }

  async function onDelete(id: string) {
    if (!confirm("Izbrisati bota?")) return;
    await fetch(`/api/telegram-bots/${id}`, { method: "DELETE", credentials: "include" });
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <AdminGate>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Obvestila — Telegram</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Shranjeno v bazi (kot <code className="text-xs">telegram_bots</code> v desktop programu). Žeton hrani varno — ne izpostavljaj javno.
          </p>
        </div>

        <form
          onSubmit={onSave}
          className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]"
        >
          {editingId ? (
            <p className="text-xs text-[var(--vo-accent)]">Urejanje obstoječega bota</p>
          ) : null}
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Ime</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Bot API žeton</span>
            <input
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--vo-muted)]">Chat ID</span>
            <input
              required
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm"
              autoComplete="off"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[var(--vo-accent)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
            >
              {editingId ? "Shrani spremembe" : "Dodaj bota"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[var(--vo-border)] px-4 py-2 text-sm"
              >
                Prekliči
              </button>
            ) : null}
          </div>
          {msg ? <p className="text-center text-sm text-[var(--vo-danger)]">{msg}</p> : null}
        </form>

        {bots.length > 0 ? (
          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Obstoječi boti</h2>
            <ul className="mt-3 space-y-2">
              {bots.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm"
                >
                  <span className="font-medium text-[var(--vo-fg)]">{b.name}</span>
                  <span className="flex gap-2">
                    <button type="button" className="text-[var(--vo-accent)] text-xs" onClick={() => startEdit(b)}>
                      Uredi
                    </button>
                    <button type="button" className="text-[var(--vo-danger)] text-xs" onClick={() => void onDelete(b.id)}>
                      Briši
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AdminGate>
  );
}
