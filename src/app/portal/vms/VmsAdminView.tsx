"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { Camera, Monitor, Plus, RadioTower, ShieldCheck, UserPlus } from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import type { VmsAdminCustomerDto, VmsAdminOverviewDto } from "@/lib/repositories/vms-admin";

type FormKind = "customer" | "site" | "camera" | "user" | "claim" | null;

type EditTarget =
  | { kind: "customer"; data: VmsAdminCustomerDto }
  | { kind: "site"; data: VmsAdminCustomerDto["sites"][number] }
  | { kind: "camera"; data: VmsAdminCustomerDto["sites"][number]["cameras"][number] }
  | { kind: "user"; data: VmsAdminCustomerDto["users"][number] }
  | { kind: "password"; data: VmsAdminCustomerDto["users"][number] }
  | null;

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function postJson(url: string, payload: Record<string, unknown>) {
  return requestJson(url, "POST", payload);
}

async function requestJson(url: string, method: "POST" | "PUT" | "DELETE", payload?: Record<string, unknown>) {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Napaka pri shranjevanju.");
  return data;
}

function CustomerCard({
  customer,
  onEditCustomer,
  onDeleteCustomer,
  onEditSite,
  onDeleteSite,
  onEditCamera,
  onDeleteCamera,
  onEditUser,
  onDeleteUser,
  onResetUserPassword,
  onDeleteClaim,
  onDownloadGatewayBundle,
}: {
  customer: VmsAdminCustomerDto;
  onEditCustomer: (customer: VmsAdminCustomerDto) => void;
  onDeleteCustomer: (customer: VmsAdminCustomerDto) => void;
  onEditSite: (site: VmsAdminCustomerDto["sites"][number]) => void;
  onDeleteSite: (site: VmsAdminCustomerDto["sites"][number]) => void;
  onEditCamera: (camera: VmsAdminCustomerDto["sites"][number]["cameras"][number]) => void;
  onDeleteCamera: (camera: VmsAdminCustomerDto["sites"][number]["cameras"][number]) => void;
  onEditUser: (user: VmsAdminCustomerDto["users"][number]) => void;
  onDeleteUser: (user: VmsAdminCustomerDto["users"][number]) => void;
  onResetUserPassword: (user: VmsAdminCustomerDto["users"][number]) => void;
  onDeleteClaim: (claim: VmsAdminCustomerDto["sites"][number]["claims"][number]) => void;
  onDownloadGatewayBundle: (site: VmsAdminCustomerDto["sites"][number]) => void;
}) {
  const usageColor = customer.cameraCount > customer.cameraLimit ? "text-[var(--vo-danger)]" : "text-[var(--vo-accent)]";
  return (
    <article className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--vo-fg)]">{customer.name}</h3>
          <p className="mt-1 text-xs text-[var(--vo-muted)]">
            {customer.email || "Brez emaila"} · {customer.planName}
          </p>
        </div>
        <span className={`rounded-full bg-[var(--vo-accent-muted)] px-2 py-1 text-xs font-semibold ${usageColor}`}>
          {customer.cameraCount}/{customer.cameraLimit} kamer
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <MutationButton label="Uredi stranko" onClick={() => onEditCustomer(customer)} />
        <MutationButton label="Izbriši stranko" danger onClick={() => onDeleteCustomer(customer)} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniStat label="Objekti" value={customer.siteCount} />
        <MiniStat label="Uporabniki" value={customer.userCount} />
        <MiniStat label="Gatewayi" value={`${customer.gatewaysOnline}/${customer.gatewayCount}`} />
        <MiniStat label="Slug" value={customer.slug} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {customer.sites.map((site) => (
          <div key={site.id} className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--vo-fg)]">{site.name}</p>
                <p className="mt-1 text-xs text-[var(--vo-muted)]">
                  NVR: {site.nvrName || "ni vpisan"} · {site.nvrIp || "brez IP"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-[var(--vo-muted)]">{site.cameras.length} kamer</span>
                <div className="flex gap-1">
                  <MutationButton label="Uredi" onClick={() => onEditSite(site)} />
                  <MutationButton label="Izbriši" danger onClick={() => onDeleteSite(site)} />
                </div>
              </div>
            </div>
            {site.cameras.length > 0 ? (
              <div className="mt-3 divide-y divide-[var(--vo-border)] rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)]">
                {site.cameras.map((camera) => (
                  <div key={camera.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className="text-[var(--vo-fg)]">
                      CH{camera.channel} · {camera.name} {camera.ip ? `· ${camera.ip}` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-[var(--vo-muted)]">{camera.status}</span>
                      <MutationButton label="Uredi" onClick={() => onEditCamera(camera)} />
                      <MutationButton label="Izbriši" danger onClick={() => onDeleteCamera(camera)} />
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-3 space-y-1 text-xs text-[var(--vo-muted)]">
              <div className="mb-2">
                <MutationButton label="Prenesi gateway paket (ZIP)" onClick={() => onDownloadGatewayBundle(site)} />
              </div>
              {site.gateways.map((gateway) => (
                <p key={gateway.id}>
                  Gateway {gateway.name}: <span className="font-semibold text-[var(--vo-fg)]">{gateway.status}</span>
                </p>
              ))}
              {site.claims.map((claim) => (
                <div key={claim.id} className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    Claim: <span className="font-mono text-[var(--vo-accent)]">{claim.code}</span>{" "}
                    {claim.consumedAt ? "(uporabljena)" : "(aktivna)"}
                  </p>
                  <MutationButton label="Izbriši claim" danger onClick={() => onDeleteClaim(claim)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {customer.users.length > 0 ? (
        <div className="mt-4 rounded-lg border border-[var(--vo-border)]">
          {customer.users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--vo-border)] px-3 py-2 text-xs last:border-0">
              <span>
                <span className="font-semibold text-[var(--vo-fg)]">{user.email}</span>{" "}
                <span className="text-[var(--vo-muted)]">· {user.role} · {user.isActive ? "aktiven" : "neaktiven"}</span>
              </span>
              <span className="flex flex-wrap gap-1">
                <MutationButton label="Uredi" onClick={() => onEditUser(user)} />
                <MutationButton label="Reset gesla" onClick={() => onResetUserPassword(user)} />
                <MutationButton label="Izbriši" danger onClick={() => onDeleteUser(user)} />
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function MutationButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border border-[var(--vo-border)] px-2 py-1 text-[11px] font-semibold hover:bg-[var(--vo-surface-2)] ${
        danger ? "text-[var(--vo-danger)]" : "text-[var(--vo-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-bg)] px-3 py-2">
      <p className="text-[11px] text-[var(--vo-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[var(--vo-fg)]">{value}</p>
    </div>
  );
}

export function VmsAdminView({ initial }: { initial: VmsAdminOverviewDto }) {
  const router = useRouter();
  const { role } = usePortalRole();
  const [form, setForm] = useState<FormKind>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bundleMeta, setBundleMeta] = useState<{ siteName: string; claimCode: string; externalId: string } | null>(null);

  const firstCustomer = initial.customers[0];
  const firstSite = firstCustomer?.sites[0];
  const totals = useMemo(
    () => ({
      customers: initial.customers.length,
      sites: initial.customers.reduce((sum, customer) => sum + customer.siteCount, 0),
      cameras: initial.customers.reduce((sum, customer) => sum + customer.cameraCount, 0),
      gateways: initial.customers.reduce((sum, customer) => sum + customer.gatewayCount, 0),
    }),
    [initial.customers],
  );

  async function handleAction(event: React.FormEvent<HTMLFormElement>, kind: Exclude<FormKind, null>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      if (kind === "customer") {
        await postJson("/api/vms-admin", {
          name: text(data.get("name")),
          slug: text(data.get("slug")),
          contact: text(data.get("contact")),
          email: text(data.get("email")),
          phone: text(data.get("phone")),
          planId: text(data.get("planId")),
        });
      }
      if (kind === "site") {
        await postJson("/api/vms-admin/sites", {
          customerId: text(data.get("customerId")),
          name: text(data.get("name")),
          address: text(data.get("address")),
          nvrName: text(data.get("nvrName")),
          nvrIp: text(data.get("nvrIp")),
          nvrModel: text(data.get("nvrModel")),
        });
      }
      if (kind === "camera") {
        await postJson("/api/vms-admin/cameras", {
          siteId: text(data.get("siteId")),
          name: text(data.get("name")),
          channel: Number(text(data.get("channel")) || "1"),
          ip: text(data.get("ip")),
          model: text(data.get("model")),
        });
      }
      if (kind === "user") {
        await postJson("/api/vms-admin/users", {
          customerId: text(data.get("customerId")),
          email: text(data.get("email")),
          name: text(data.get("name")),
          password: text(data.get("password")),
          role: text(data.get("role")),
        });
      }
      if (kind === "claim") {
        await postJson("/api/vms-admin/claims", {
          siteId: text(data.get("siteId")),
          name: text(data.get("name")),
          externalId: text(data.get("externalId")),
          daysValid: Number(text(data.get("daysValid")) || "30"),
        });
      }
      setNotice("Shranjeno.");
      setForm(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Napaka pri shranjevanju.");
    } finally {
      setSubmitting(false);
    }
  }

  async function ensurePlans() {
    setError(null);
    setSubmitting(true);
    try {
      await postJson("/api/vms-admin", { action: "ensure-plans" });
      setNotice("Privzeti VMS paketi so pripravljeni.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Napaka pri pripravi paketov.");
    } finally {
      setSubmitting(false);
    }
  }

  async function runMutation(action: () => Promise<unknown>, success: string) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      setNotice(success);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Napaka pri shranjevanju.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    if (!editTarget) return;
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      if (editTarget.kind === "customer") {
        await requestJson(`/api/vms-admin/customers/${editTarget.data.id}`, "PUT", {
          name: text(data.get("name")),
          slug: text(data.get("slug")),
          contact: text(data.get("contact")),
          email: text(data.get("email")),
          phone: text(data.get("phone")),
          planId: text(data.get("planId")) || undefined,
        });
        setNotice("VMS stranka je posodobljena.");
      }
      if (editTarget.kind === "site") {
        await requestJson(`/api/vms-admin/sites/${editTarget.data.id}`, "PUT", {
          name: text(data.get("name")),
          address: text(data.get("address")),
          nvrName: text(data.get("nvrName")),
          nvrIp: text(data.get("nvrIp")),
          nvrModel: text(data.get("nvrModel")),
        });
        setNotice("VMS objekt je posodobljen.");
      }
      if (editTarget.kind === "camera") {
        await requestJson(`/api/vms-admin/cameras/${editTarget.data.id}`, "PUT", {
          name: text(data.get("name")),
          channel: Number(text(data.get("channel")) || "1"),
          ip: text(data.get("ip")),
          model: text(data.get("model")),
          enabled: data.get("enabled") === "on",
        });
        setNotice("VMS kamera je posodobljena.");
      }
      if (editTarget.kind === "user") {
        await requestJson(`/api/vms-admin/users/${editTarget.data.id}`, "PUT", {
          email: text(data.get("email")),
          name: text(data.get("name")),
          role: text(data.get("role")),
          isActive: data.get("isActive") === "on",
        });
        setNotice("VMS uporabnik je posodobljen.");
      }
      if (editTarget.kind === "password") {
        const password = text(data.get("password"));
        if (!password) throw new Error("Geslo je obvezno.");
        await requestJson(`/api/vms-admin/users/${editTarget.data.id}/password`, "POST", { password });
        setNotice("Geslo je resetirano.");
      }
      setEditTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Napaka pri shranjevanju.");
    } finally {
      setSubmitting(false);
    }
  }

  function openCreate(kind: FormKind) {
    setEditTarget(null);
    setForm(form === kind ? null : kind);
  }
  function openEdit(target: EditTarget) {
    setForm(null);
    setEditTarget(target);
  }

  function deleteCustomer(customer: VmsAdminCustomerDto) {
    if (!window.confirm(`Izbrišem VMS stranko "${customer.name}"? Izbrisani bodo tudi objekti, kamere in uporabniki.`)) return;
    void runMutation(() => requestJson(`/api/vms-admin/customers/${customer.id}`, "DELETE"), "VMS stranka je izbrisana.");
  }

  function deleteSite(site: VmsAdminCustomerDto["sites"][number]) {
    if (!window.confirm(`Izbrišem objekt "${site.name}"?`)) return;
    void runMutation(() => requestJson(`/api/vms-admin/sites/${site.id}`, "DELETE"), "VMS objekt je izbrisan.");
  }

  function deleteCamera(camera: VmsAdminCustomerDto["sites"][number]["cameras"][number]) {
    if (!window.confirm(`Izbrišem kamero "${camera.name}"?`)) return;
    void runMutation(() => requestJson(`/api/vms-admin/cameras/${camera.id}`, "DELETE"), "VMS kamera je izbrisana.");
  }

  function deleteUser(user: VmsAdminCustomerDto["users"][number]) {
    if (!window.confirm(`Izbrišem uporabnika "${user.email}"?`)) return;
    void runMutation(() => requestJson(`/api/vms-admin/users/${user.id}`, "DELETE"), "VMS uporabnik je izbrisan.");
  }

  function resetUserPassword(user: VmsAdminCustomerDto["users"][number]) {
    openEdit({ kind: "password", data: user });
  }

  function deleteClaim(claim: VmsAdminCustomerDto["sites"][number]["claims"][number]) {
    if (!window.confirm(`Izbrišem claim kodo "${claim.code}"?`)) return;
    void runMutation(() => requestJson(`/api/vms-admin/claims/${claim.id}`, "DELETE"), "Gateway claim koda je izbrisana.");
  }

  async function downloadGatewayBundle(site: VmsAdminCustomerDto["sites"][number]) {
    setError(null);
    setSubmitting(true);
    setBundleMeta(null);
    try {
      const res = await fetch(`/api/vms-admin/sites/${encodeURIComponent(site.id)}/gateway-bundle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Generiranje paketa ni uspelo.");
      }
      const claimCode = res.headers.get("X-VisionOne-Claim-Code") ?? "";
      const externalId = res.headers.get("X-VisionOne-Gateway-Id") ?? "";
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? `visionone-vms-gateway-${site.id}.zip`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setBundleMeta({ siteName: site.name, claimCode, externalId });
      setNotice(`Gateway paket za ${site.name} je prenesen.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prenos paketa ni uspel.");
    } finally {
      setSubmitting(false);
    }
  }

  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 text-sm text-[var(--vo-muted)]">
        Dostop do VMS control plane-a je dovoljen samo administratorjem.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vo-fg)]">VisionOne VMS</h1>
          <p className="mt-1 text-sm text-[var(--vo-muted)]">
            Produkcijski control plane za stranke, licence, kamere, uporabnike in Raspberry Pi gatewaye.
          </p>
        </div>
        <a
          href={initial.vmsBaseUrl || "https://vms.visionone.si"}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm font-semibold text-[var(--vo-accent)] hover:bg-[var(--vo-surface-2)]"
        >
          Odpri VMS portal
        </a>
      </div>

      {!initial.dbConfigured ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          VMS baza ni nastavljena. Dodaj `VMS_DATABASE_URL` v portal okolje.
        </div>
      ) : null}
      {notice ? <div className="rounded-xl border border-[var(--vo-ok-muted)] bg-[var(--vo-ok-muted)] px-4 py-3 text-sm text-[var(--vo-ok)]">{notice}</div> : null}
      {bundleMeta ? (
        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] px-4 py-3 text-sm">
          <p className="font-semibold text-[var(--vo-fg)]">Gateway paket: {bundleMeta.siteName}</p>
          <p className="mt-1 text-[var(--vo-muted)]">
            Claim koda: <code className="text-[var(--vo-accent)]">{bundleMeta.claimCode}</code> · Gateway ID:{" "}
            <code className="text-[var(--vo-fg)]">{bundleMeta.externalId}</code>
          </p>
          <p className="mt-1 text-xs text-[var(--vo-muted)]">
            Claim je že v bazi. Kopiraj ZIP na Raspberry Pi in zaženi <code>install.sh</code> ali ročno <code>python3 visionone_vms_gateway.py</code>.
          </p>
        </div>
      ) : null}
      {error ? <div className="rounded-xl border border-[var(--vo-danger-muted)] bg-[var(--vo-danger-muted)] px-4 py-3 text-sm text-[var(--vo-danger)]">{error}</div> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <MiniStat label="VMS stranke" value={totals.customers} />
        <MiniStat label="Objekti" value={totals.sites} />
        <MiniStat label="Kamere" value={totals.cameras} />
        <MiniStat label="Gatewayi" value={totals.gateways} />
      </section>

      <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={ensurePlans} disabled={submitting || !initial.dbConfigured} className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)] disabled:opacity-50">
            <ShieldCheck className="mr-1 inline h-4 w-4" /> Pripravi VMS pakete
          </button>
          <ActionButton label="Nova VMS stranka" icon={Plus} onClick={() => openCreate("customer")} />
          <ActionButton label="Dodaj objekt" icon={Monitor} onClick={() => openCreate("site")} disabled={!firstCustomer} />
          <ActionButton label="Dodaj kamero" icon={Camera} onClick={() => openCreate("camera")} disabled={!firstSite} />
          <ActionButton label="Dodaj uporabnika" icon={UserPlus} onClick={() => openCreate("user")} disabled={!firstCustomer} />
          <ActionButton label="Gateway claim" icon={RadioTower} onClick={() => openCreate("claim")} disabled={!firstSite} />
        </div>
      </section>

      {editTarget ? (
        <section className="rounded-xl border border-[var(--vo-accent)]/40 bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
          <VmsEditForm target={editTarget} initial={initial} submitting={submitting} onSubmit={handleEdit} onCancel={() => setEditTarget(null)} />
        </section>
      ) : null}

      {form ? (
        <section className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
          <VmsForm kind={form} initial={initial} submitting={submitting} onSubmit={(event) => handleAction(event, form)} />
        </section>
      ) : null}

      <section className="space-y-4">
        {initial.customers.length === 0 ? (
          <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-5 text-sm text-[var(--vo-muted)]">
            Ni VMS strank. Najprej pripravi VMS pakete in ustvari prvo stranko.
          </div>
        ) : null}
        {initial.customers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onEditCustomer={(customer) => openEdit({ kind: "customer", data: customer })}
            onDeleteCustomer={deleteCustomer}
            onEditSite={(site) => openEdit({ kind: "site", data: site })}
            onDeleteSite={deleteSite}
            onEditCamera={(camera) => openEdit({ kind: "camera", data: camera })}
            onDeleteCamera={deleteCamera}
            onEditUser={(user) => openEdit({ kind: "user", data: user })}
            onDeleteUser={deleteUser}
            onResetUserPassword={resetUserPassword}
            onDeleteClaim={deleteClaim}
            onDownloadGatewayBundle={(site) => void downloadGatewayBundle(site)}
          />
        ))}
      </section>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-[var(--vo-border)] px-3 py-2 text-sm hover:bg-[var(--vo-surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="mr-1 inline h-4 w-4" />
      {label}
    </button>
  );
}

function VmsForm({
  kind,
  initial,
  submitting,
  onSubmit,
}: {
  kind: Exclude<FormKind, null>;
  initial: VmsAdminOverviewDto;
  submitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const sites = initial.customers.flatMap((customer) => customer.sites.map((site) => ({ ...site, customerName: customer.name })));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm font-semibold text-[var(--vo-fg)]">
        {kind === "customer" ? "Nova VMS stranka" : kind === "site" ? "Nov objekt" : kind === "camera" ? "Nova kamera" : kind === "user" ? "Nov VMS uporabnik" : "Nova gateway claim koda"}
      </p>
      {kind === "customer" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Input name="name" label="Ime stranke" required />
          <Input name="slug" label="Slug" />
          <Select name="planId" label="Licenca" options={initial.plans.map((plan) => ({ value: plan.id, label: `${plan.name} (${plan.cameraLimit} kamer)` }))} required />
          <Input name="contact" label="Kontakt" />
          <Input name="email" label="Email" type="email" />
          <Input name="phone" label="Telefon" />
        </div>
      ) : null}
      {kind === "site" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Select name="customerId" label="VMS stranka" options={initial.customers.map((customer) => ({ value: customer.id, label: customer.name }))} required />
          <Input name="name" label="Ime objekta" required />
          <Input name="address" label="Naslov" />
          <Input name="nvrName" label="NVR ime" />
          <Input name="nvrIp" label="NVR IP (opcijsko)" />
          <Input name="nvrModel" label="NVR model" />
        </div>
      ) : null}
      {kind === "camera" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Select name="siteId" label="Objekt" options={sites.map((site) => ({ value: site.id, label: `${site.customerName} / ${site.name}` }))} required />
          <Input name="name" label="Ime kamere" required />
          <Input name="channel" label="Kanal" type="number" defaultValue="1" required />
          <Input name="ip" label="IP (opcijsko, Pi najde sam)" />
          <Input name="model" label="Model" />
        </div>
      ) : null}
      {kind === "user" ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Select name="customerId" label="VMS stranka" options={initial.customers.map((customer) => ({ value: customer.id, label: customer.name }))} required />
          <Input name="email" label="Email" type="email" required />
          <Input name="name" label="Ime" />
          <Input name="password" label="Začasno geslo" type="text" required />
          <Select name="role" label="Vloga" options={[{ value: "owner", label: "owner" }, { value: "admin", label: "admin" }, { value: "viewer", label: "viewer" }]} />
        </div>
      ) : null}
      {kind === "claim" ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Select name="siteId" label="Objekt" options={sites.map((site) => ({ value: site.id, label: `${site.customerName} / ${site.name}` }))} required />
          <Input name="name" label="Gateway ime" defaultValue="VisionOne Pi Gateway" />
          <Input name="externalId" label="Gateway external ID" />
          <Input name="daysValid" label="Velja dni" type="number" defaultValue="30" />
        </div>
      ) : null}
      <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? "Shranjujem…" : "Shrani"}
      </button>
    </form>
  );
}

function VmsEditForm({
  target,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  target: NonNullable<EditTarget>;
  initial: VmsAdminOverviewDto;
  submitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const titles: Record<NonNullable<EditTarget>["kind"], string> = {
    customer: "Uredi VMS stranko",
    site: "Uredi objekt",
    camera: "Uredi kamero",
    user: "Uredi uporabnika",
    password: "Reset gesla",
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--vo-fg)]">{titles[target.kind]}</p>
        <button type="button" onClick={onCancel} className="text-xs font-semibold text-[var(--vo-muted)] hover:text-[var(--vo-fg)]">
          Prekliči
        </button>
      </div>

      {target.kind === "customer" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Input name="name" label="Ime stranke" defaultValue={target.data.name} required />
          <Input name="slug" label="Slug" defaultValue={target.data.slug} />
          <Select
            name="planId"
            label="Licenca"
            defaultValue={target.data.planId}
            options={initial.plans.map((plan) => ({ value: plan.id, label: `${plan.name} (${plan.cameraLimit} kamer)` }))}
            required
          />
          <Input name="contact" label="Kontakt" defaultValue={target.data.contact} />
          <Input name="email" label="Email" type="email" defaultValue={target.data.email} />
          <Input name="phone" label="Telefon" defaultValue={target.data.phone} />
        </div>
      ) : null}

      {target.kind === "site" ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Input name="name" label="Ime objekta" defaultValue={target.data.name} required />
            <Input name="address" label="Naslov" defaultValue={target.data.address} />
            <Input name="nvrName" label="NVR ime" defaultValue={target.data.nvrName} />
            <Input name="nvrIp" label="NVR IP" defaultValue={target.data.nvrIp} placeholder="Samodejno iz mreže" />
            <Input name="nvrModel" label="NVR model" defaultValue={target.data.nvrModel} />
          </div>
          <p className="text-xs text-[var(--vo-muted)] md:col-span-3">
            NVR IP in IP-ji kamer se po namestitvi gatewaya na Pi-ju posodobijo samodejno. Polja spodaj so opcijska ročna override vrednost.
          </p>
        </>
      ) : null}

      {target.kind === "camera" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Input name="name" label="Ime kamere" defaultValue={target.data.name} required />
          <Input name="channel" label="Kanal" type="number" defaultValue={String(target.data.channel)} required />
          <Input name="ip" label="IP kamere" defaultValue={target.data.ip} placeholder="Samodejno iz mreže" />
          <Input name="model" label="Model" defaultValue={target.data.model} />
          <Checkbox name="enabled" label="Kamera aktivna" defaultChecked={target.data.enabled} />
        </div>
      ) : null}

      {target.kind === "user" ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Input name="email" label="Email" type="email" defaultValue={target.data.email} required />
          <Input name="name" label="Ime" defaultValue={target.data.name} />
          <Select
            name="role"
            label="Vloga"
            defaultValue={target.data.role}
            options={[
              { value: "owner", label: "owner" },
              { value: "admin", label: "admin" },
              { value: "viewer", label: "viewer" },
            ]}
          />
          <Checkbox name="isActive" label="Uporabnik aktiven" defaultChecked={target.data.isActive} />
        </div>
      ) : null}

      {target.kind === "password" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <p className="text-sm text-[var(--vo-muted)] md:col-span-2">
            Novo geslo za <strong className="text-[var(--vo-fg)]">{target.data.email}</strong>
          </p>
          <Input name="password" label="Novo začasno geslo" type="text" required />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--vo-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {submitting ? "Shranjujem…" : "Shrani spremembe"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--vo-border)] px-4 py-2 text-sm hover:bg-[var(--vo-surface-2)]">
          Prekliči
        </button>
      </div>
    </form>
  );
}

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--vo-fg)]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="rounded border-[var(--vo-border)]" />
      {label}
    </label>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[var(--vo-muted)]">
      {label}
      <input {...props} className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm text-[var(--vo-fg)]" />
    </label>
  );
}

function Select({
  label,
  options,
  defaultValue,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[var(--vo-muted)]">
      {label}
      <select
        {...props}
        defaultValue={defaultValue}
        className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm text-[var(--vo-fg)]"
      >
        <option value="">Izberi…</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
