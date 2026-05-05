"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePortalRole } from "@/context/PortalRoleContext";
import { mockClientPortalClientId } from "@/lib/mock-data";
import type { ClientSummary, MaintenanceReminder, ReminderKind } from "@/lib/types";

const KIND_LABELS: Record<ReminderKind, string> = {
  ciscenje_kamer: "čiščenje kamer",
  diski: "diski",
  servis: "servis",
  drugo: "drugo",
};

type Props = {
  reminders: MaintenanceReminder[];
  clients: ClientSummary[];
  dbConfigured: boolean;
};

export function OpomnikiView({ reminders, clients, dbConfigured }: Props) {
  const { role } = usePortalRole();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rows =
    role === "client"
      ? reminders.filter((r) => r.clientId === mockClientPortalClientId)
      : reminders;

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      clientId: String(form.get("clientId") ?? ""),
      title: String(form.get("title") ?? ""),
      dueDate: String(form.get("dueDate") ?? ""),
      kind: String(form.get("kind") ?? "drugo"),
    };
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Napaka pri ustvarjanju opomnika.");
      return;
    }
    setNotice("Opomnik je uspešno shranjen.");
    setShowForm(false);
    router.refresh();
  }

  async function toggleCompleted(r: MaintenanceReminder) {
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: !r.completed }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri posodobitvi.");
      return;
    }
    setNotice("Status opomnika je posodobljen.");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Izbrišem opomnik?")) return;
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri brisanju.");
      return;
    }
    setNotice("Opomnik je uspešno izbrisan.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Opomniki za vzdrževanje</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Redni servisi in čiščenja.
          </p>
        </div>
        {role === "admin" ? (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-sm font-semibold text-white"
          >
            {showForm ? "Prekliči" : "Nov opomnik"}
          </button>
        ) : null}
      </div>

      {!dbConfigured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Baza ni nastavljena. Prikazani so demo opomniki.
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-[var(--vo-ok-muted)] bg-[var(--vo-ok-muted)] px-4 py-3 text-sm text-[var(--vo-ok)]">
          {notice}
        </div>
      ) : null}

      {showForm && role === "admin" ? (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <select name="clientId" required className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm">
              <option value="">— izberi stranko —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="kind" defaultValue="drugo" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm">
              <option value="ciscenje_kamer">Čiščenje kamer</option>
              <option value="diski">Diski</option>
              <option value="servis">Servis</option>
              <option value="drugo">Drugo</option>
            </select>
            <input
              name="title"
              required
              placeholder="Naslov opomnika"
              className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="dueDate"
              type="date"
              required
              className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
            />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Shranjujem…" : "Shrani"}
          </button>
        </form>
      ) : null}

      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3 text-sm text-[var(--vo-muted)]">
            Ni opomnikov.
          </li>
        ) : null}
        {rows.map((r) => (
          <li
            key={r.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3 shadow-[var(--vo-card-shadow)] ${
              r.completed ? "opacity-60" : ""
            }`}
          >
            <div>
              <p className={`font-medium text-[var(--vo-fg)] ${r.completed ? "line-through" : ""}`}>
                {r.title}
              </p>
              <p className="text-xs text-[var(--vo-muted)]">
                {r.clientName} · {KIND_LABELS[r.kind]}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <time className="text-sm font-semibold text-[var(--vo-accent)]">
                {new Date(r.dueDate).toLocaleDateString("sl-SI")}
              </time>
              {role === "admin" && dbConfigured ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleCompleted(r)}
                    className="rounded-lg border border-[var(--vo-border)] px-2 py-1 text-xs font-medium text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
                  >
                    {r.completed ? "Ponovno odpri" : "Označi opravljeno"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Izbriši
                  </button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
