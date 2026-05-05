"use client";

import { useState } from "react";
import { usePortalToast } from "@/context/PortalToastContext";

export function NastavitvePortalPassword() {
  const { showToast } = usePortalToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/portal-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      }),
    });
    setBusy(false);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      showToast(data?.error ?? "Sprememba gesla ni uspela.", "err");
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    showToast("Geslo je bilo uspešno spremenjeno.");
  }

  return (
    <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)] md:p-6">
      <h2 className="text-lg font-semibold text-[var(--vo-fg)]">Sprememba portala gesla</h2>
      <p className="mt-1 text-sm text-[var(--vo-muted)]">
        Geslo za prijavo v portal (ne Clerk). Minimalna dolžina 8 znakov.
      </p>
      <form onSubmit={(ev) => void onSubmit(ev)} className="mt-4 grid max-w-md gap-3">
        <label className="text-xs">
          <span className="text-[var(--vo-muted)]">Trenutno geslo</span>
          <input
            type="password"
            value={current}
            onChange={(ev) => setCurrent(ev.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="text-[var(--vo-muted)]">Novo geslo</span>
          <input
            type="password"
            value={next}
            onChange={(ev) => setNext(ev.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="text-[var(--vo-muted)]">Potrdi novo geslo</span>
          <input
            type="password"
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Shranjujem…" : "Shrani novo geslo"}
        </button>
      </form>
    </div>
  );
}
