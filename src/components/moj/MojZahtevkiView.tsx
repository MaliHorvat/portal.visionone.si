"use client";

import { useEffect, useState } from "react";
import type { ClientSummary, ServiceRequest } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  new: "Prejeto",
  in_progress: "V teku",
  waiting_customer: "Čaka na vas",
  done: "Zaključeno",
};

export function MojZahtevkiView() {
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    void Promise.all([
      fetch("/api/moj/overview", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/service-requests", { credentials: "include" }).then((r) => r.json()),
    ]).then(([ov, req]) => {
      setClient((ov as { client?: ClientSummary }).client ?? null);
      const all = (req as { requests?: ServiceRequest[] }).requests ?? [];
      const cid = (ov as { client?: ClientSummary }).client?.id;
      setRequests(cid ? all.filter((r) => r.clientId === cid) : []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    setNotice(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        clientId: client.id,
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        priority: "medium",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setNotice((j as { error?: string }).error ?? "Zahtevek ni bil poslan.");
      return;
    }
    setShowForm(false);
    setNotice("Zahtevek je poslan — odzovemo se v najkrajšem možnem času.");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Zahtevki</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">Oddajte povpraševanje ali spremljajte status obstoječih zahtevkov.</p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="vo-btn-primary px-4 py-2 text-sm">
          {showForm ? "Prekliči" : "Nov zahtevek"}
        </button>
      </div>

      {notice ? (
        <p className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-accent-muted)] px-4 py-2 text-sm text-[var(--vo-fg)]">
          {notice}
        </p>
      ) : null}

      {showForm && client ? (
        <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5">
          <div>
            <label className="text-xs font-semibold text-[var(--vo-muted)]">Zadeva</label>
            <input name="title" required className="vo-input mt-1 w-full text-sm" placeholder="npr. Menjava kamere pri vhodu" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--vo-muted)]">Opis</label>
            <textarea name="description" rows={4} className="vo-input mt-1 w-full text-sm" placeholder="Kaj potrebujete?" />
          </div>
          <button type="submit" disabled={busy} className="vo-btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
            {busy ? "Pošiljam…" : "Pošlji zahtevek"}
          </button>
        </form>
      ) : null}

      <ul className="space-y-3">
        {requests.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--vo-border)] px-4 py-8 text-center text-sm text-[var(--vo-muted)]">
            Še nimate zahtevkov.
          </li>
        ) : (
          requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold text-[var(--vo-fg)]">{r.title}</p>
                <span className="rounded-full bg-[var(--vo-surface-2)] px-2.5 py-0.5 text-xs font-bold text-[var(--vo-accent)]">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              {r.description ? <p className="mt-2 text-sm text-[var(--vo-muted)]">{r.description}</p> : null}
              <p className="mt-2 text-xs text-[var(--vo-muted)]">Posodobljeno: {new Date(r.updatedAt).toLocaleString("sl-SI")}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
