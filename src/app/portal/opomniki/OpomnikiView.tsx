"use client";

import { useMemo, useState } from "react";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { removeFromList, replaceInList } from "@/lib/portal-list-mutate";
import { usePortalToast } from "@/context/PortalToastContext";
import { exportRemindersCsv } from "@/lib/portal-export";
import { usePortalRole } from "@/context/PortalRoleContext";
import { mockClientPortalClientId } from "@/lib/mock-data";
import { REMINDER_KIND_LABELS } from "@/lib/client-preventive";
import type { ClientSummary, MaintenanceReminder, ReminderKind } from "@/lib/types";

const KIND_LABELS = REMINDER_KIND_LABELS;

type Props = {
  reminders: MaintenanceReminder[];
  clients: ClientSummary[];
  dbConfigured: boolean;
  onRemindersChange: React.Dispatch<React.SetStateAction<MaintenanceReminder[]>>;
};

export function OpomnikiView({ reminders, clients, dbConfigured, onRemindersChange }: Props) {
  const { role } = usePortalRole();
  const { showToast } = usePortalToast();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | ReminderKind>("all");
  const [showCompleted, setShowCompleted] = useState(false);

  const baseRows =
    role !== "admin"
      ? reminders.filter((r) => r.clientId === mockClientPortalClientId)
      : reminders;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseRows.filter((r) => {
      if (!showCompleted && r.completed) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.dueDate.includes(q)
      );
    });
  }, [baseRows, search, kindFilter, showCompleted]);

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
      clientVisible: form.get("clientVisible") === "on",
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
    const j = (await res.json()) as { reminder?: MaintenanceReminder };
    if (j.reminder) onRemindersChange((prev) => [j.reminder!, ...prev]);
    showToast("Opomnik je shranjen.");
    setShowForm(false);
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
    const j = (await res.json()) as { reminder?: MaintenanceReminder };
    if (j.reminder) onRemindersChange((prev) => replaceInList(prev, j.reminder!));
    showToast("Status opomnika posodobljen.");
  }

  async function handleDelete(id: string) {
    if (!confirm("Izbrišem opomnik?")) return;
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri brisanju.");
      return;
    }
    onRemindersChange((prev) => removeFromList(prev, id));
    showToast("Opomnik izbrisan.");
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        kicker="Vzdrževanje"
        title="Opomniki"
        description="Redni servisi, čiščenje kamer in roki po strankah."
        actions={
          role === "admin" ? (
            <button type="button" onClick={() => setShowForm((s) => !s)} className="vo-btn-primary px-4 py-2 text-sm">
              {showForm ? "Prekliči" : "Nov opomnik"}
            </button>
          ) : null
        }
      />

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

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-sm">
        <input
          type="search"
          placeholder="Išči opomnike…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-1 vo-input px-3 py-1.5 text-sm"
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
          className="vo-select px-2 py-1.5 text-xs"
        >
          <option value="all">Vse vrste</option>
          {(Object.keys(KIND_LABELS) as ReminderKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 text-xs text-[var(--vo-muted)]">
          <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
          Zaključeni
        </label>
        <button
          type="button"
          className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
          onClick={() =>
            exportRemindersCsv(
              rows.map((r) => ({
                title: r.title,
                clientName: r.clientName,
                dueDate: r.dueDate,
                completed: r.completed,
              })),
            )
          }
        >
          Izvozi CSV
        </button>
        <span className="text-xs text-[var(--vo-muted)]">{rows.length} opomnikov</span>
      </div>

      {showForm && role === "admin" ? (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <select name="clientId" required className="vo-input px-3 py-2 text-sm">
              <option value="">— izberi stranko —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="kind" defaultValue="drugo" className="vo-input px-3 py-2 text-sm">
              {(Object.keys(KIND_LABELS) as ReminderKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <input
              name="title"
              required
              placeholder="Naslov opomnika"
              className="vo-input px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="dueDate"
              type="date"
              required
              className="vo-input px-3 py-2 text-sm md:col-span-2"
            />
            <label className="inline-flex items-center gap-2 text-xs text-[var(--vo-muted)] md:col-span-2">
              <input type="checkbox" name="clientVisible" defaultChecked />
              Prikaži na moj.visionone.si
            </label>
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
                {!r.clientVisible ? " · samo interno" : " · moj portal"}
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
