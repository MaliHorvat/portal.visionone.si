"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { exportClientsCsv } from "@/lib/portal-export";
import { getFavoriteClientIds, getRecentClients, toggleFavoriteClient } from "@/lib/portal-prefs";
import { PortalContextMenu, type ContextMenuItem } from "@/components/portal/PortalContextMenu";
import { usePortalRole } from "@/context/PortalRoleContext";
import { clientProfilePath } from "@/lib/client-url";
import type { ClientSummary, SubscriptionPackageDto } from "@/lib/types";

type Props = {
  clients: ClientSummary[];
  packages: SubscriptionPackageDto[];
  dbConfigured: boolean;
  /** Napaka pri branju iz baze (npr. shema ni posodobljena); stran prikaže demo podatke. */
  loadError?: string | null;
};

export function StrankeView({ clients, packages, dbConfigured, loadError = null }: Props) {
  const { role } = usePortalRole();
  const router = useRouter();
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

  useEffect(() => {
    setFavoriteIds(getFavoriteClientIds());
  }, []);

  const recentClients = useMemo(() => getRecentClients(), []);

  const filteredClients = useMemo(() => {
    let list = orderedClients;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address ?? "").toLowerCase().includes(q) ||
          (c.contact ?? "").toLowerCase().includes(q),
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
    const payload = {
      name: String(form.get("name") ?? ""),
      address: String(form.get("address") ?? ""),
      contact: String(form.get("contact") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      packageId: String(form.get("packageId") ?? "") || null,
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
    setNotice(editClientId ? "Stranka je uspešno posodobljena." : "Stranka je uspešno shranjena.");
    setShowForm(false);
    setEditClientId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Izbrišem stranko?")) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNotice(data?.error ?? "Napaka pri brisanju.");
      return;
    }
    setNotice("Stranka je uspešno izbrisana.");
    router.refresh();
  }

  function prefetchProfile(client: ClientSummary) {
    router.prefetch(clientProfilePath(client));
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
      setNotice("Napaka pri shranjevanju vrstnega reda.");
      router.refresh();
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

  function contextItems(client: ClientSummary): ContextMenuItem[] {
    return [
      {
        id: "open",
        label: "Odpri profil",
        onClick: () => router.push(clientProfilePath(client)),
      },
      {
        id: "open-new",
        label: "Odpri v novem zavihku",
        onClick: () => window.open(clientProfilePath(client), "_blank", "noopener,noreferrer"),
      },
      {
        id: "edit",
        label: "Uredi",
        onClick: () => {
          setError(null);
          setNotice(null);
          setEditClientId(client.id);
          setShowForm(true);
        },
      },
      {
        id: "delete",
        label: "Izbriši",
        danger: true,
        disabled: !dbConfigured,
        onClick: () => void handleDelete(client.id),
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">Stranke</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Seznam strank in paketov.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowForm((s) => !s);
            setEditClientId(null);
          }}
          className="rounded-lg bg-[var(--vo-accent)] px-3 py-2 text-sm font-semibold text-white"
        >
          {showForm ? "Prekliči" : "Nova stranka"}
        </button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {loadError}
        </div>
      ) : !dbConfigured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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

      {(recentClients.length > 0 || favoriteIds.length > 0) && (
        <section className="grid gap-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 text-sm md:grid-cols-2">
          {recentClients.length > 0 ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--vo-muted)]">Nedavno odprto</h2>
              <ul className="mt-2 space-y-1">
                {recentClients.slice(0, 6).map((r) => {
                  const c = clients.find((x) => x.id === r.id);
                  if (!c) return null;
                  return (
                    <li key={r.id}>
                      <Link href={clientProfilePath(c)} className="text-[var(--vo-accent)] hover:underline">
                        {r.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {favoriteIds.length > 0 ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--vo-muted)]">Priljubljene</h2>
              <ul className="mt-2 space-y-1">
                {favoriteIds.map((fid) => {
                  const c = clients.find((x) => x.id === fid);
                  if (!c) return null;
                  return (
                    <li key={fid} className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                      <Link href={clientProfilePath(c)} className="hover:underline">
                        {c.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-sm">
        <input
          type="search"
          placeholder="Išči stranke…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-1.5"
        />
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value as typeof healthFilter)}
          className="rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-xs"
        >
          <option value="all">Vsi statusi</option>
          <option value="ok">Samo OK</option>
          <option value="alarm">Samo alarm</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-lg border border-[var(--vo-border)] bg-transparent px-2 py-1.5 text-xs"
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
              })),
            )
          }
        >
          Izvozi CSV
        </button>
        <span className="text-xs text-[var(--vo-muted)]">{filteredClients.length} / {orderedClients.length}</span>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input name="name" required placeholder="Ime stranke" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.name ?? "" : ""} className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="address" placeholder="Naslov" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.address ?? "" : ""} className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="contact" placeholder="Kontaktna oseba" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.contact ?? "" : ""} className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="phone" placeholder="Telefon" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.phone ?? "" : ""} className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="E-naslov" defaultValue={editClientId ? clients.find((c) => c.id === editClientId)?.email ?? "" : ""} className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm" />
            <select
              name="packageId"
              defaultValue={
                editClientId ? clients.find((c) => c.id === editClientId)?.package?.id ?? "" : ""
              }
              className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm md:col-span-2"
            >
              <option value="">— brez paketa —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price} €)
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
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
            className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 shadow-[var(--vo-card-shadow)]"
            onContextMenu={(e) => openClientMenu(e, c.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[var(--vo-fg)]">{c.name}</p>
                <p className="text-xs text-[var(--vo-muted)]">{c.address || "—"}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  c.health === "ok"
                    ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]"
                    : "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"
                }`}
              >
                {c.health === "ok" ? "V redu" : "Alarm"}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--vo-muted)]">
              {c.contact || "—"}
              {c.phone ? ` · ${c.phone}` : ""}
            </p>
            <div className="mt-3 flex items-center justify-end gap-3">
              <Link
                href={clientProfilePath(c)}
                prefetch
                onMouseEnter={() => prefetchProfile(c)}
                onTouchStart={() => prefetchProfile(c)}
                className="rounded-md border border-[var(--vo-border)] px-2 py-1 text-xs font-medium text-[var(--vo-accent)]"
              >
                Profil
              </Link>
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
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
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
                className="border-b border-[var(--vo-border)] last:border-0"
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
                    <button
                      type="button"
                      title={favoriteIds.includes(c.id) ? "Odstrani iz priljubljenih" : "Dodaj med priljubljene"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFavoriteIds(toggleFavoriteClient(c.id));
                      }}
                      className="text-[var(--vo-muted)] hover:text-amber-400"
                    >
                      <Star
                        className={`h-4 w-4 ${favoriteIds.includes(c.id) ? "fill-amber-400 text-amber-400" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {c.name}
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
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.health === "ok"
                        ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]"
                        : "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"
                    }`}
                  >
                    {c.health === "ok" ? "V redu" : "Alarm"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="mr-3 text-xs text-[var(--vo-muted)]">Povleci za premik</span>
                  <Link
                    href={clientProfilePath(c)}
                    prefetch
                    onMouseEnter={() => prefetchProfile(c)}
                    className="font-medium text-[var(--vo-accent)] hover:underline"
                  >
                    Profil
                  </Link>
                  <button
                    type="button"
                    className="ml-3 text-xs font-medium text-[var(--vo-fg)] hover:underline"
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
                      className="ml-3 text-xs font-medium text-red-600 hover:underline"
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
