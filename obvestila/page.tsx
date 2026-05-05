"use client";

import { useState } from "react";
import { AdminGate } from "@/components/portal/AdminGate";

export default function ObvestilaPage() {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saved, setSaved] = useState(false);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <AdminGate>
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Obvestila — Telegram</h1>
        <p className="mt-1 text-sm text-[var(--vo-muted)]">
          Nastavitve za integracijo bota. Vrednosti ostanejo v brskalniku (demo) — v produkciji jih
          shrani Go backend in ne izpostavljaj v frontendu.
        </p>
      </div>

      <form
        onSubmit={onSave}
        className="space-y-4 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-6 shadow-[var(--vo-card-shadow)]"
      >
        <label className="block text-sm">
          <span className="text-[var(--vo-muted)]">Bot API žeton</span>
          <input
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setSaved(false);
            }}
            placeholder="123456:ABC..."
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm"
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--vo-muted)]">Chat ID (admin)</span>
          <input
            value={chatId}
            onChange={(e) => {
              setChatId(e.target.value);
              setSaved(false);
            }}
            placeholder="-100xxxxxxxxxx"
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 font-mono text-sm"
            autoComplete="off"
          />
        </label>
        <p className="text-xs text-[var(--vo-muted)]">
          Ob izpadu naprave bo worker v Go klical Telegram API in poslal push obvestilo na ta kanal.
        </p>
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--vo-accent)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--vo-accent-hover)]"
        >
          Shrani (demo)
        </button>
        {saved ? (
          <p className="text-center text-sm text-[var(--vo-ok)]">Shranjeno v seji (simulacija).</p>
        ) : null}
      </form>
    </div>
    </AdminGate>
  );
}
