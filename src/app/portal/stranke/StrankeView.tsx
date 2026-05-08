"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalContextMenu, type ContextMenuItem } from "@/components/portal/PortalContextMenu";
import { usePortalRole } from "@/context/PortalRoleContext";
import { clientProfilePath } from "@/lib/client-url";
import { mockClientPortalSlug } from "@/lib/mock-data";
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; clientId: string } | null>(null);

  useEffect(() => {
    if (role !== "admin") {
      router.replace(`/portal/stranke/${encodeURIComponent(mockClientPortalSlug)}`);
    }
  }, [role, router]);

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

  function contextItems(client: ClientSummary): ContextMenuItem[] {
    return [
      {
        id: "open",
        label: "Odpri profil",
        onClick: () => router.push(clientProfilePath(client)),
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
        {clients.length === 0 ? (
          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-6 text-center text-sm text-[var(--vo-muted)]">
            Ni strank.
          </div>
        ) : null}
        {clients.map((c) => (
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
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--vo-muted)]">
                  Ni strank.
                </td>
              </tr>
            ) : null}
            {clients.map((c) => (
              <tr
                key={c.id}
                className="border-b border-[var(--vo-border)] last:border-0"
                onContextMenu={(e) => openClientMenu(e, c.id)}
              >
                <td className="px-4 py-3 font-medium text-[var(--vo-fg)]">{c.name}</td>
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
      {ctxMenu && clients.some((c) => c.id === ctxMenu.clientId) ? (
        <PortalContextMenu
          open
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={contextItems(clients.find((c) => c.id === ctxMenu.clientId)!)}
        />
      ) : null}
    </div>
  );
}
