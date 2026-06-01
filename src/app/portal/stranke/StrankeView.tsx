"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { removeFromList, replaceInList } from "@/lib/portal-list-mutate";
import { usePortalToast } from "@/context/PortalToastContext";
import type { ClientDetail } from "@/lib/types";
import { exportClientsCsv } from "@/lib/portal-export";
import { getFavoriteClientIds, toggleFavoriteClient } from "@/lib/portal-prefs";
import { buildClientContextMenuItems, copyClientContactText } from "@/lib/client-context-menu";
import { ClientMojStatusDot } from "@/components/portal/ClientMojStatusDot";
import { PortalContextMenu } from "@/components/portal/PortalContextMenu";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { usePortalRole } from "@/context/PortalRoleContext";
import { clientProfilePath } from "@/lib/client-url";
import type { ClientSummary, SubscriptionPackageDto } from "@/lib/types";

type Props = {
  clients: ClientSummary[];
  packages: SubscriptionPackageDto[];
  dbConfigured: boolean;
  /** Napaka pri branju iz baze (npr. shema ni posodobljena); stran prikaže demo podatke. */
  loadError?: string | null;
  onClientsChange: React.Dispatch<React.SetStateAction<ClientSummary[]>>;
};

export function StrankeView({ clients, packages, dbConfigured, loadError = null, onClientsChange }: Props) {
  const { role } = usePortalRole();
  const router = useRouter();
  const { showToast } = usePortalToast();
  const canAdmin = role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; clientId: string } | null>(null);
  const [orderedClients, setOrderedClients] = useState(clients);
  const [dragId, setDragId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "ok" | "alarm">("all");
  const [sortBy, setSortBy] = useState<"name" | "health">("name");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setFavoriteIds(getFavoriteClientIds());
  }, []);

  const filteredClients = useMemo(() => {
    let list = orderedClients;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address ?? "").toLowerCase().includes(q) ||
          (c.contact ?? "").toLowerCase().includes(q) ||
          (c.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (healthFilter !== "all") list = list.filter((c) => c.health === healthFilter);
    if (favoritesOnly) list = list.filter((c) => favoriteIds.includes(c.id));
    list = [...list].sort((a, b) => {
      if (sortBy === "health") return a.health.localeCompare(b.health) || a.name.localeCompare(b.name, "sl");
      return a.name.localeCompare(b.name, "sl");
    });
    return list;
  }, [orderedClients, search, healthFilter, favoritesOnly, favoriteIds, sortBy]);

  useEffect(() => {
    setOrderedClients(clients);
  }, [clients]);

  useEffect(() => {
    if (role === "admin") return;
    const first = clients[0];
    if (!first) return;
    router.replace(clientProfilePath(first));
  }, [role, router, clients]);

  if (role !== "admin") {
    return <p className="text-sm text-[var(--vo-muted)]">Preusmerjam na vaš objekt …</p>;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const tagsRaw = String(form.get("tags") ?? "");
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      name: String(form.get("name") ?? ""),
      address: String(form.get("address") ?? ""),
      contact: String(form.get("contact") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      tags,
      packageId: String(form.get("packageId") ?? "") || null,
      health: String(form.get("health") ?? "ok") === "alarm" ? "alarm" : "ok",
      mojPortalEnabled: form.get("mojPortalEnabled") === "on",
    };
    const url = editClientId ? `/api/clients/${encodeURIComponent(editClientId)}` : "/api/clients";
    const method = editClientId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? (editClientId ? "Napaka pri urejanju stranke." : "Napaka pri ustvarjanju stranke."));
      return;
    }
    const j = (await res.json()) as { client?: ClientDetail };
    if (j.client) {
      if (editClientId) {
        onClientsChange((prev) => replaceInList(prev, j.client!));
        setOrderedClients((prev) => replaceInList(prev, j.client!));
      } else {
        onClientsChange((prev) => [j.client!, ...prev]);
        setOrderedClients((prev) => [j.client!, ...prev]);
      }
    }
    showToast(editClientId ? "Stranka posodobljena." : "Stranka shranjena.");
    setShowForm(false);
    setEditClientId(null);
  }

  async function handleImportCsv(file: File) {
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: text,
      });
      const data = (await res.json().catch(() => ({}))) as {
        created?: number;
        errors?: string[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Uvoz ni uspel.");
        return;
      }
      const errCount = data.errors?.length ?? 0;
      setNotice(
        `Uvoženo ${data.created ?? 0} strank${errCount ? ` (${errCount} napak — glej konzolo)` : ""}.`,
      );
      if (errCount) console.warn("CSV uvoz:", data.errors);
      const refreshed = await fetch("/api/clients", { credentials: "include" }).then((r) => r.json());
      if (refreshed.clients) {
        onClientsChange(refreshed.clients);
        setOrderedClients(refreshed.clients);
      }
    } catch {
      setError("Branje datoteke ni uspelo.");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Izbrišem stranko?")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri brisanju.");
      return;
    }
    onClientsChange((prev) => removeFromList(prev, id));
    setOrderedClients((prev) => removeFromList(prev, id));
    showToast("Stranka izbrisana.");
  }

  function openClientMenu(e: React.MouseEvent, clientId: string) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, clientId });
  }

  async function persistOrder(next: ClientSummary[]) {
    setOrderedClients(next);
    setReordering(true);
    const res = await fetch("/api/clients/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((c) => c.id) }),
    });
    setReordering(false);
    if (!res.ok) {
      showToast("Napaka pri shranjevanju vrstnega reda.", "err");
      setOrderedClients(clients);
      return;
    }
  }

  async function moveClientBefore(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const sourceIdx = orderedClients.findIndex((c) => c.id === sourceId);
    const targetIdx = orderedClients.findIndex((c) => c.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const next = [...orderedClients];
    const [item] = next.splice(sourceIdx, 1);
    const insertAt = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
    next.splice(insertAt, 0, item);
    await persistOrder(next);
  }

  async function patchClient(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/clients/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      showToast("Posodobitev ni uspela.", "err");
      return;
    }
    const j = (await res.json()) as { client?: ClientSummary };
    if (j.client) {
      onClientsChange((prev) => replaceInList(prev, j.client!));
      setOrderedClients((prev) => replaceInList(prev, j.client!));
    }
  }

  function openProfile(client: ClientSummary) {
    router.push(clientProfilePath(client));
  }

  function contextItems(client: ClientSummary) {
    return buildClientContextMenuItems(client, {
      isFavorite: favoriteIds.includes(client.id),
      dbConfigured,
      canAdmin,
      onOpen: () => openProfile(client),
      onOpenNewTab: () => window.open(clientProfilePath(client), "_blank", "noopener,noreferrer"),
      onEdit: () => {
        setError(null);
        setNotice(null);
        setEditClientId(client.id);
        setShowForm(true);
      },
      onDelete: () => void handleDelete(client.id),
      onToggleFavorite: () => setFavoriteIds(toggleFavoriteClient(client.id)),
      onToggleMojPortal: () => void patchClient(client.id, { mojPortalEnabled: !client.mojPortalEnabled }),
      onMarkOk: () => void patchClient(client.id, { health: "ok" }),
      onMarkAlarm: () => void patchClient(client.id, { health: "alarm" }),
      onCopyContact: () => {
        void navigator.clipboard.writeText(copyClientContactText(client)).then(
          () => showToast("Kontakt kopiran."),
          () => showToast("Kopiranje ni uspelo.", "err"),
        );
      },
      onOpenTab: (tab) => router.push(`${clientProfilePath(client)}?tab=${encodeURIComponent(tab)}`),
    });
  }

  function ClientListStatus({ c }: { c: ClientSummary }) {
    if (c.mojPortalEnabled) {
      return (
        <span className="inline-flex items-center gap-2">
          <ClientMojStatusDot enabled health={c.health} />
          <span className="text-xs text-[var(--vo-muted)]">
            {c.health === "ok" ? "moj — OK" : "moj — napaka"}
          </span>
        </span>
      );
    }
    if (c.health === "alarm") {
      return (
        <span className="inline-flex items-center gap-2" title="Alarm (brez moj portala)">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--vo-danger)]" />
          <span className="text-xs text-[var(--vo-danger)]">Alarm</span>
        </span>
      );
    }
    return <span className="text-xs text-[var(--vo-muted)]">—</span>;
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        kicker="Vodenje"
        title="Objekti & stranke"
        gradientTitle
        description="Seznam lokacij, paketov in hitri dostop do profila, Care Box-a in sheme."
        actions={
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowForm((s) => !s);
              setEditClientId(null);
            }}
            className="vo-btn-primary px-4 py-2 text-sm"
          >
            {showForm ? "Prekliči" : "Nova stranka"}
          </button>
        }
      />

      {loadError ? (
        <div className="vo-alert-error">
          {loadError}
        </div>
      ) : !dbConfigured ? (
        <div className="vo-alert-warn">
          Baza ni nastavljena. Nastavite <code>DATABASE_URL</code> v Vercelu in poženite{" "}
          <code>npm run db:push</code>. Trenutno so prikazani demo podatki in dodajanje/brisanje ne bo
          delovalo.
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-[var(--vo-ok-muted)] bg-[var(--vo-ok-muted)] px-4 py-3 text-sm text-[var(--vo-ok)]">
          {notice}
        </div>
      ) : null}

      <p className="text-xs text-[var(--vo-muted)]">
        Klik na vrstico odpre profil. Desni klik: priljubljene, moj.visionone.si, zavihki, urejanje.
      </p>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-sm">
        <input
          type="search"
          placeholder="Išči stranke…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] flex-1 vo-input px-3 py-1.5 text-sm"
        />
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value as typeof healthFilter)}
          className="vo-select px-2 py-1.5 text-xs"
        >
          <option value="all">Vsi statusi</option>
          <option value="ok">Samo OK</option>
          <option value="alarm">Samo alarm</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="vo-select px-2 py-1.5 text-xs"
        >
          <option value="name">Ime</option>
          <option value="health">Zdravje</option>
        </select>
        <label className="inline-flex items-center gap-1 text-xs text-[var(--vo-muted)]">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          Priljubljene
        </label>
        <button
          type="button"
          className="rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]"
          onClick={() =>
            exportClientsCsv(
              filteredClients.map((c) => ({
                name: c.name,
                address: c.address,
                contact: c.contact,
                phone: c.phone,
                email: c.email,
                package: c.package?.name ?? "",
                health: c.health,
                tags: (c.tags ?? []).join(", "),
              })),
            )
          }
        >
          Izvozi CSV
        </button>
        {dbConfigured ? (
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--vo-border)] px-3 py-1.5 text-xs hover:bg-[var(--vo-surface-2)]">
            {importing ? "Uvažam…" : "Uvozi CSV"}
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleImportCsv(f);
              }}
            />
          </label>
        ) : null}
        <span className="text-xs text-[var(--vo-muted)]">{filteredClients.length} / {orderedClients.length}</span>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input name="name" required placeholder="Ime stranke" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.name ?? "" : ""} className="vo-input px-3 py-2 text-sm" />
            <input name="address" placeholder="Naslov" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.address ?? "" : ""} className="vo-input px-3 py-2 text-sm" />
            <input name="contact" placeholder="Kontaktna oseba" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.contact ?? "" : ""} className="vo-input px-3 py-2 text-sm" />
            <input name="phone" placeholder="Telefon" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.phone ?? "" : ""} className="vo-input px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="E-naslov" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.email ?? "" : ""} className="vo-input px-3 py-2 text-sm" />
            <select
              name="packageId"
              defaultValue={
                editClientId ? clients.find((c) => c.id === editClientId)?.package?.id ?? "" : ""
              }
              className="vo-input px-3 py-2 text-sm"
            >
              <option value="">— brez paketa —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price} €)
                </option>
              ))}
            </select>
            <select
              name="health"
              defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.health ?? "ok" : "ok"}
              className="vo-input px-3 py-2 text-sm"
            >
              <option value="ok">Status: objekt OK</option>
              <option value="alarm">Status: alarm</option>
            </select>
            <input
              name="tags"
              placeholder="Oznake (vejica: VIP, teren)"
              defaultValue={
                editClientId ? (clients.find((c) => c.id === editClientId)?.tags ?? []).join(", ") : ""
              }
              className="vo-input px-3 py-2 text-sm md:col-span-2"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="mojPortalEnabled"
                defaultChecked={editClientId ? Boolean(clients.find((c) => c.id === editClientId)?.mojPortalEnabled) : false}
              />
              <span>
                Stranka uporablja <strong>moj.visionone.si</strong> za spremljanje statusa kamer
              </span>
            </label>
          </div>
          {error ? <p className="text-sm text-[var(--vo-danger)]">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Shranjujem…" : editClientId ? "Shrani spremembe" : "Shrani"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3 md:hidden">
        {orderedClients.length === 0 ? (
          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-6 text-center text-sm text-[var(--vo-muted)]">
            Ni strank.
          </div>
        ) : null}
        {filteredClients.map((c) => (
          <div
            key={`m-${c.id}`}
            role="button"
            tabIndex={0}
            className="cursor-pointer rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 shadow-[var(--vo-card-shadow)] transition hover:border-[var(--vo-accent)]/40 hover:bg-[var(--vo-surface-2)]"
            onClick={() => openProfile(c)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openProfile(c);
              }
            }}
            onContextMenu={(e) => openClientMenu(e, c.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ClientMojStatusDot enabled={Boolean(c.mojPortalEnabled)} health={c.health} />
                <div>
                  <p className="font-semibold text-[var(--vo-fg)]">
                    {c.name}
                    {favoriteIds.includes(c.id) ? (
                      <span className="ml-1 text-amber-500" aria-hidden>
                        ★
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--vo-muted)]">{c.address || "—"}</p>
                </div>
              </div>
              <ClientListStatus c={c} />
            </div>
            <p className="mt-2 text-xs text-[var(--vo-muted)]">
              {c.contact || "—"}
              {c.phone ? ` · ${c.phone}` : ""}
            </p>
            {(c.tags ?? []).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[var(--vo-surface-2)] px-2 py-0.5 text-[10px] text-[var(--vo-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="text-xs font-medium text-[var(--vo-fg)] hover:underline"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setEditClientId(c.id);
                  setShowForm(true);
                }}
              >
                Uredi
              </button>
              {dbConfigured ? (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Izbriši
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)] md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Ime</th>
              <th className="px-4 py-3 font-medium">Naslov</th>
              <th className="px-4 py-3 font-medium">Kontakt</th>
              <th className="px-4 py-3 font-medium">Paket</th>
              <th className="px-4 py-3 font-medium">Moj / stanje</th>
              <th className="px-4 py-3 font-medium w-28" />
            </tr>
          </thead>
          <tbody>
            {orderedClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--vo-muted)]">
                  Ni strank.
                </td>
              </tr>
            ) : null}
            {filteredClients.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-b border-[var(--vo-border)] last:border-0 hover:bg-[var(--vo-surface-2)]/80"
                onClick={() => openProfile(c)}
                onContextMenu={(e) => openClientMenu(e, c.id)}
                draggable={!reordering}
                onDragStart={() => setDragId(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragId) return;
                  void moveClientBefore(dragId, c.id);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
              >
                <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">
                  <span className="inline-flex items-center gap-2">
                    <ClientMojStatusDot enabled={Boolean(c.mojPortalEnabled)} health={c.health} />
                    <span>
                      {c.name}
                      {favoriteIds.includes(c.id) ? (
                        <span className="ml-1 text-amber-500" title="Priljubljena">
                          ★
                        </span>
                      ) : null}
                      {(c.tags ?? []).length > 0 ? (
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-[var(--vo-surface-2)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--vo-muted)]"
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--vo-muted)]">{c.address}</td>
                <td className="px-4 py-3 text-[var(--vo-muted)]">
                  {c.contact}
                  {c.phone ? (
                    <>
                      <br />
                      <span className="text-xs">{c.phone}</span>
                    </>
                  ) : null}
                  {c.email ? (
                    <>
                      <br />
                      <span className="text-xs">{c.email}</span>
                    </>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[var(--vo-fg)]">{c.package?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <ClientListStatus c={c} />
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <span className="mr-2 text-[10px] text-[var(--vo-muted)]" title="Povleci vrstico">
                    ⋮⋮
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--vo-fg)] hover:underline"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setEditClientId(c.id);
                      setShowForm(true);
                    }}
                  >
                    Uredi
                  </button>
                  {dbConfigured ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="ml-2 text-xs font-medium text-red-600 hover:underline"
                    >
                      Izbriši
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ctxMenu && orderedClients.some((c) => c.id === ctxMenu.clientId) ? (
        <PortalContextMenu
          open
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={contextItems(orderedClients.find((c) => c.id === ctxMenu.clientId)!)}
        />
      ) : null}
    </div>
  );
}
