"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { exportServiceRequestsCsv } from "@/lib/portal-export";
import type { ClientSummary, ServiceRequest, ServiceRequestPriority, ServiceRequestStatus } from "@/lib/types";

type Props = {
  requests: ServiceRequest[];
  clients: ClientSummary[];
  dbConfigured: boolean;
};

const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  new: "Novo",
  in_progress: "V teku",
  waiting_customer: "Čaka stranko",
  done: "Zaključeno",
};

const PRIORITY_LABEL: Record<ServiceRequestPriority, string> = {
  low: "Nizka",
  medium: "Srednja",
  high: "Visoka",
  urgent: "Nujna",
};

export function ZahtevkiView({ requests, clients, dbConfigured }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ServiceRequestStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const pa: Record<ServiceRequestPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        if (pa[b.priority] !== pa[a.priority]) return pa[b.priority] - pa[a.priority];
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const clientName = clients.find((c) => c.id === r.clientId)?.name ?? "";
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        clientName.toLowerCase().includes(q)
      );
    });
  }, [sorted, search, statusFilter, clients]);

  async function createRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      clientId: String(form.get("clientId") ?? "") || null,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      priority: String(form.get("priority") ?? "medium"),
      dueDate: String(form.get("dueDate") ?? ""),
      assignee: String(form.get("assignee") ?? ""),
    };
    const res = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMessage(j.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    setShowForm(false);
    setMessage("Zahtevek je dodan.");
    router.refresh();
  }

  async function patchRequest(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/service-requests/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMessage(j.error ?? "Posodobitev ni uspela.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Zahtevki</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Interni operativni zahtevki za vsakodnevno delo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-sm font-semibold text-white"
        >
          {showForm ? "Prekliči" : "Nov zahtevek"}
        </button>
      </div>

      {!dbConfigured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Baza ni nastavljena. Zahtevki so onemogočeni.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-sm">
        <input
          type="search"
          placeholder="Išči zahtevke…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-1 rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-1.5"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-xs"
        >
          <option value="all">Vsi statusi</option>
          {(Object.keys(STATUS_LABEL) as ServiceRequestStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
          onClick={() =>
            exportServiceRequestsCsv(
              filtered.map((r) => ({
                title: r.title,
                clientName: clients.find((c) => c.id === r.clientId)?.name ?? "",
                status: STATUS_LABEL[r.status],
                priority: PRIORITY_LABEL[r.priority],
                dueDate: r.dueDate ?? "",
              })),
            )
          }
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <span className="text-xs text-[var(--vo-muted)]">{filtered.length} zapisov</span>
      </div>

      {showForm ? (
        <form
          onSubmit={createRequest}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="title"
              required
              placeholder="Naslov zahtevka"
              className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
            />
            <select name="clientId" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm">
              <option value="">— brez stranke —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              name="priority"
              defaultValue="medium"
              className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="low">Nizka</option>
              <option value="medium">Srednja</option>
              <option value="high">Visoka</option>
              <option value="urgent">Nujna</option>
            </select>
            <input name="assignee" placeholder="Dodeljeno (ime)" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="dueDate" type="date" className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <textarea
              name="description"
              rows={3}
              placeholder="Opis zahtevka"
              className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Shranjujem..." : "Shrani zahtevek"}
          </button>
        </form>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3 text-sm text-[var(--vo-fg)]">
          {message}
        </div>
      ) : null}

      <ul className="space-y-3">
        {sorted.length === 0 ? (
          <li className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3 text-sm text-[var(--vo-muted)]">
            Ni zahtevkov.
          </li>
        ) : null}
        {filtered.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3 shadow-[var(--vo-card-shadow)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-[var(--vo-fg)]">{r.title}</p>
              <div className="flex items-center gap-2">
                <select
                  value={r.status}
                  onChange={(e) => void patchRequest(r.id, { status: e.target.value })}
                  className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1 text-xs"
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={r.priority}
                  onChange={(e) => void patchRequest(r.id, { priority: e.target.value })}
                  className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1 text-xs"
                >
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-[var(--vo-muted)]">
              {r.clientName ? `${r.clientName} · ` : ""}Ustvaril: {r.createdBy}
              {r.assignee ? ` · Dodeljeno: ${r.assignee}` : ""}
              {r.dueDate ? ` · Rok: ${r.dueDate}` : ""}
            </p>
            {r.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--vo-fg)]/90">{r.description}</p> : null}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {dbConfigured ? (
                <button
                  type="button"
                  onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                  className="text-xs font-medium text-[var(--vo-accent)] hover:underline"
                >
                  {expandedId === r.id ? "Skrij priloge" : "Priloge"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void fetch(`/api/service-requests/${r.id}`, { method: "DELETE" }).then(() => router.refresh())}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Izbriši
              </button>
            </div>
            {expandedId === r.id && dbConfigured ? (
              <ZahtevkiAttachments requestId={r.id} />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

type AttRow = { id: string; originalName: string; mimeType: string; sizeBytes: number };

function ZahtevkiAttachments({ requestId }: { requestId: string }) {
  const [files, setFiles] = useState<AttRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/service-requests/${requestId}/attachments`, { credentials: "include" });
    if (!r.ok) return;
    const j = (await r.json()) as { attachments?: AttRow[] };
    setFiles(j.attachments ?? []);
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Datoteka je prevelika (največ 5 MB).");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const r = await fetch(`/api/service-requests/${requestId}/attachments`, {
      method: "POST",
      body: fd,
    });
    setBusy(false);
    if (r.ok) void load();
  }

  async function onDelete(attId: string) {
    if (!confirm("Izbris priloge?")) return;
    await fetch(`/api/service-requests/${requestId}/attachments/${attId}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="mt-3 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--vo-muted)]">Priloge ({files.length})</span>
        <label className="cursor-pointer text-xs text-[var(--vo-accent)] hover:underline">
          {busy ? "Nalagam…" : "+ Dodaj datoteko"}
          <input type="file" className="sr-only" disabled={busy} onChange={(e) => void onUpload(e)} />
        </label>
      </div>
      {files.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--vo-muted)]">Ni prilog.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 text-xs">
              <a
                href={`/api/service-requests/${requestId}/attachments/${f.id}`}
                className="truncate text-[var(--vo-accent)] hover:underline"
              >
                {f.originalName}
              </a>
              <span className="shrink-0 text-[var(--vo-muted)]">
                {(f.sizeBytes / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => void onDelete(f.id)}
                className="shrink-0 text-red-600 hover:underline"
              >
                Briši
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

