"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  History,
  MapPin,
  Pencil,
  Phone,
  Printer,
  StickyNote,
  X,
} from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import { usePortalToast } from "@/context/PortalToastContext";
import type { ClientDetail, ClientHealth, SubscriptionPackageDto } from "@/lib/types";
import type { WorkspaceCtx } from "./client-workspace/types";

type Props = {
  ctx: WorkspaceCtx;
  onOpenPonudbe?: () => void;
};

export function ClientProfileEditor({ ctx, onOpenPonudbe }: Props) {
  const { role } = usePortalRole();
  const { showToast } = usePortalToast();
  const { client, dbConfigured, applyClient } = ctx;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [packages, setPackages] = useState<SubscriptionPackageDto[]>([]);
  const [form, setForm] = useState({
    name: client.name,
    address: client.address ?? "",
    contact: client.contact ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    packageId: client.package?.id ?? "",
    health: client.health as ClientHealth,
    tags: (client.tags ?? []).join(", "),
  });
  const [internalNote, setInternalNote] = useState("");
  const [noteMeta, setNoteMeta] = useState<{ updatedBy: string; updatedAt: string | null } | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRows, setHistoryRows] = useState<
    Array<{ id: string; field: string; oldValue: string; newValue: string; username: string; createdAt: string }>
  >([]);
  const [historyBusy, setHistoryBusy] = useState(false);

  useEffect(() => {
    setForm({
      name: client.name,
      address: client.address ?? "",
      contact: client.contact ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
      packageId: client.package?.id ?? "",
      health: client.health,
      tags: (client.tags ?? []).join(", "),
    });
  }, [client]);

  useEffect(() => {
    if (!dbConfigured) return;
    void fetch(`/api/clients/${client.id}/internal-note`, { credentials: "include" })
      .then((r) => r.json())
      .then(
        (j: { content?: string; updatedBy?: string; updatedAt?: string | null }) => {
          setInternalNote(j.content ?? "");
          setNoteMeta({
            updatedBy: j.updatedBy ?? "",
            updatedAt: j.updatedAt ?? null,
          });
        },
      )
      .catch(() => {});
  }, [client.id, dbConfigured]);

  useEffect(() => {
    if (role !== "admin" || !dbConfigured) return;
    void fetch("/api/packages", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { packages?: SubscriptionPackageDto[] }) => setPackages(j.packages ?? []))
      .catch(() => {});
  }, [role, dbConfigured]);

  const save = useCallback(async () => {
    if (!dbConfigured) return;
    setBusy(true);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        address: form.address.trim(),
        contact: form.contact.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        packageId: form.packageId || null,
        health: form.health,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      showToast("Shranjevanje profila ni uspelo.", "err");
      return;
    }
    const j = (await res.json()) as { client?: ClientDetail };
    if (j.client) applyClient(j.client);
    setEditing(false);
    showToast("Profil stranke posodobljen.");
    if (j.client?.slug && j.client.slug !== client.slug) {
      const tab = new URLSearchParams(window.location.search).get("tab");
      const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
      window.location.href = `/portal/stranke/${encodeURIComponent(j.client.slug)}${qs}`;
    }
  }, [applyClient, client.id, client.slug, dbConfigured, form, showToast]);

  async function quickHealth(next: ClientHealth) {
    if (!dbConfigured || role !== "admin") return;
    setForm((f) => ({ ...f, health: next }));
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ health: next }),
    });
    if (!res.ok) {
      showToast("Posodobitev statusa ni uspela.", "err");
      return;
    }
    const j = (await res.json()) as { client?: ClientDetail };
    if (j.client) applyClient(j.client);
    showToast(next === "ok" ? "Status: objekt OK" : "Status: alarm");
  }

  async function copyContact() {
    const lines = [
      client.name,
      client.address && `Naslov: ${client.address}`,
      client.contact && `Kontakt: ${client.contact}`,
      client.phone && `Tel: ${client.phone}`,
      client.email && `E-pošta: ${client.email}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      showToast("Kontaktni podatki kopirani.");
    } catch {
      showToast("Kopiranje ni uspelo.", "err");
    }
  }

  function openMaps() {
    if (!client.address?.trim()) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function saveInternalNote() {
    if (!dbConfigured) return;
    setNoteBusy(true);
    const res = await fetch(`/api/clients/${client.id}/internal-note`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: internalNote }),
    });
    setNoteBusy(false);
    if (!res.ok) {
      showToast("Shranjevanje opombe ni uspelo.", "err");
      return;
    }
    showToast("Interna opomba shranjena.");
    void fetch(`/api/clients/${client.id}/internal-note`, { credentials: "include" })
      .then((r) => r.json())
      .then((j: { updatedBy?: string; updatedAt?: string | null }) => {
        setNoteMeta({ updatedBy: j.updatedBy ?? "", updatedAt: j.updatedAt ?? null });
      })
      .catch(() => {});
  }

  async function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (!next || !dbConfigured) return;
    setHistoryBusy(true);
    const res = await fetch(`/api/clients/${client.id}/profile-history`, { credentials: "include" });
    setHistoryBusy(false);
    if (!res.ok) return;
    const j = (await res.json()) as {
      changes?: Array<{
        id: string;
        field: string;
        oldValue: string;
        newValue: string;
        username: string;
        createdAt: string;
      }>;
    };
    setHistoryRows(j.changes ?? []);
  }

  function printProfile() {
    const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!w) return;
    const esc = (s: string) =>
      s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${esc(client.name)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{font-size:20px}p{margin:6px 0;font-size:14px}.muted{color:#555}</style></head><body>
      <h1>${esc(client.name)}</h1>
      <p class="muted">VisionOne — kartica stranke</p>
      <p><b>Naslov:</b> ${esc(client.address || "—")}</p>
      <p><b>Kontakt:</b> ${esc(client.contact || "—")}</p>
      <p><b>Telefon:</b> ${esc(client.phone || "—")}</p>
      <p><b>E-pošta:</b> ${esc(client.email || "—")}</p>
      <p><b>Paket:</b> ${esc(client.package?.name ?? "—")}</p>
      <p><b>Status:</b> ${client.health === "ok" ? "OK" : "Alarm"}</p>
      <p><b>Kamere:</b> ${client.cameras.length} · <b>NVR:</b> ${client.nvrs.length}</p>
      <script>window.print()</script></body></html>`;
    w.document.write(html);
    w.document.close();
  }

  const canEdit = role === "admin" && dbConfigured;
  const healthOk = client.health === "ok";

  if (editing && canEdit) {
    return (
      <div className="rounded-xl border border-[var(--vo-accent)]/40 bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--vo-fg)]">Uredi profil stranke</h2>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            aria-label="Prekliči"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs sm:col-span-2">
            <span className="text-[var(--vo-muted)]">Ime / naziv</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[var(--vo-muted)]">Naslov</span>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-[var(--vo-muted)]">Kontaktna oseba</span>
            <input
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-[var(--vo-muted)]">Telefon</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[var(--vo-muted)]">E-pošta</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[var(--vo-muted)]">Paket naročnine</span>
            <select
              value={form.packageId}
              onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            >
              <option value="">— brez paketa —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price} €)
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[var(--vo-muted)]">Status objekta</span>
            <select
              value={form.health}
              onChange={(e) => setForm((f) => ({ ...f, health: e.target.value as ClientHealth }))}
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            >
              <option value="ok">Objekt OK</option>
              <option value="alarm">Alarm</option>
            </select>
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[var(--vo-muted)]">Oznake (vejica)</span>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="VIP, teren"
              className="mt-1 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !form.name.trim()}
            onClick={() => void save()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Shrani
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-[var(--vo-border)] px-4 py-2 text-sm"
          >
            Prekliči
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      {(client.tags ?? []).length > 0 ? (
        <div className="flex w-full flex-wrap gap-1 pb-1">
          {client.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-[var(--vo-surface-2)] px-2 py-0.5 text-[10px] text-[var(--vo-muted)]"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--vo-surface-2)]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Uredi profil
        </button>
      ) : null}
      {canEdit ? (
        <>
          <button
            type="button"
            onClick={() => void quickHealth("ok")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              healthOk
                ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]"
                : "border border-[var(--vo-border)] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            }`}
          >
            Označi OK
          </button>
          <button
            type="button"
            onClick={() => void quickHealth("alarm")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              !healthOk
                ? "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"
                : "border border-[var(--vo-border)] text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
            }`}
          >
            Označi alarm
          </button>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => void copyContact()}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
      >
        <Copy className="h-3.5 w-3.5" />
        Kopiraj kontakt
      </button>
      {client.address ? (
        <button
          type="button"
          onClick={openMaps}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
        >
          <MapPin className="h-3.5 w-3.5" />
          Zemljevid
        </button>
      ) : null}
      {client.phone ? (
        <a
          href={`tel:${client.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
        >
          <Phone className="h-3.5 w-3.5" />
          Pokliči
        </a>
      ) : null}
      {client.email ? (
        <a
          href={`mailto:${client.email}`}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          E-pošta
        </a>
      ) : null}
      <button
        type="button"
        onClick={printProfile}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
      >
        <Printer className="h-3.5 w-3.5" />
        Natisni
      </button>
      {dbConfigured ? (
        <a
          href={`/api/clients/${client.id}/vcard`}
          download={`${client.name.replace(/\s+/g, "-")}.vcf`}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
        >
          vCard
        </a>
      ) : null}
      {canEdit && dbConfigured ? (
        <button
          type="button"
          onClick={() => void toggleHistory()}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-border)] px-2.5 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
        >
          <History className="h-3.5 w-3.5" />
          Zgodovina
        </button>
      ) : null}
      {onOpenPonudbe ? (
        <button
          type="button"
          onClick={onOpenPonudbe}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--vo-accent)]/50 bg-[var(--vo-accent-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--vo-accent)]"
        >
          <FileText className="h-3.5 w-3.5" />
          Ponudbe
        </button>
      ) : null}
    </div>
    {showHistory && canEdit ? (
      <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs">
        {historyBusy ? (
          <p className="text-[var(--vo-muted)]">Nalagam…</p>
        ) : historyRows.length === 0 ? (
          <p className="text-[var(--vo-muted)]">Ni zabeleženih sprememb profila.</p>
        ) : (
          <ul className="space-y-2">
            {historyRows.map((h) => (
              <li key={h.id} className="border-b border-[var(--vo-border)] pb-2 last:border-0">
                <span className="font-medium text-[var(--vo-fg)]">{h.field}</span>
                <span className="text-[var(--vo-muted)]">
                  {" "}
                  · {h.username} · {new Date(h.createdAt).toLocaleString("sl-SI")}
                </span>
                <div className="mt-0.5 text-[var(--vo-muted)] line-through">{h.oldValue || "—"}</div>
                <div className="text-[var(--vo-fg)]">{h.newValue || "—"}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : null}
    {canEdit && dbConfigured ? (
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--vo-fg)]">
          <StickyNote className="h-3.5 w-3.5" />
          Interna opomba (samo ekipa)
        </div>
        {noteMeta?.updatedAt ? (
          <p className="mt-1 text-[10px] text-[var(--vo-muted)]">
            {noteMeta.updatedBy ? `${noteMeta.updatedBy} · ` : ""}
            {new Date(noteMeta.updatedAt).toLocaleString("sl-SI")}
          </p>
        ) : null}
        <textarea
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2 text-sm"
          placeholder="Opombe za interno uporabo…"
        />
        <button
          type="button"
          disabled={noteBusy}
          onClick={() => void saveInternalNote()}
          className="mt-2 rounded-lg bg-[var(--vo-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {noteBusy ? "Shranjujem…" : "Shrani opombo"}
        </button>
      </div>
    ) : null}
    </div>
  );
}
