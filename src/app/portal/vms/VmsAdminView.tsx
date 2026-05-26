"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { Camera, Monitor, Plus, RadioTower, ShieldCheck, UserPlus } from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import type { VmsAdminCustomerDto, VmsAdminOverviewDto } from "@/lib/repositories/vms-admin";

type FormKind = "customer" | "site" | "camera" | "user" | "claim" | null;

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function postJson(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Napaka pri shranjevanju.");
  return data;
}

function CustomerCard({ customer }: { customer: VmsAdminCustomerDto }) {
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
              <span className="text-xs text-[var(--vo-muted)]">{site.cameras.length} kamer</span>
            </div>
            <div className="mt-3 space-y-1 text-xs text-[var(--vo-muted)]">
              {site.gateways.map((gateway) => (
                <p key={gateway.id}>
                  Gateway {gateway.name}: <span className="font-semibold text-[var(--vo-fg)]">{gateway.status}</span>
                </p>
              ))}
              {site.claims.map((claim) => (
                <p key={claim.id}>
                  Claim: <span className="font-mono text-[var(--vo-accent)]">{claim.code}</span>{" "}
                  {claim.consumedAt ? "(uporabljena)" : "(aktivna)"}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
          <ActionButton label="Nova VMS stranka" icon={Plus} onClick={() => setForm(form === "customer" ? null : "customer")} />
          <ActionButton label="Dodaj objekt" icon={Monitor} onClick={() => setForm(form === "site" ? null : "site")} disabled={!firstCustomer} />
          <ActionButton label="Dodaj kamero" icon={Camera} onClick={() => setForm(form === "camera" ? null : "camera")} disabled={!firstSite} />
          <ActionButton label="Dodaj uporabnika" icon={UserPlus} onClick={() => setForm(form === "user" ? null : "user")} disabled={!firstCustomer} />
          <ActionButton label="Gateway claim" icon={RadioTower} onClick={() => setForm(form === "claim" ? null : "claim")} disabled={!firstSite} />
        </div>
      </section>

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
          <CustomerCard key={customer.id} customer={customer} />
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
          <Input name="nvrIp" label="NVR IP" />
          <Input name="nvrModel" label="NVR model" />
        </div>
      ) : null}
      {kind === "camera" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Select name="siteId" label="Objekt" options={sites.map((site) => ({ value: site.id, label: `${site.customerName} / ${site.name}` }))} required />
          <Input name="name" label="Ime kamere" required />
          <Input name="channel" label="Kanal" type="number" defaultValue="1" required />
          <Input name="ip" label="IP" />
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

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[var(--vo-muted)]">
      {label}
      <input {...props} className="rounded-lg border border-[var(--vo-border)] bg-transparent px-3 py-2 text-sm text-[var(--vo-fg)]" />
    </label>
  );
}

function Select({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[var(--vo-muted)]">
      {label}
      <select {...props} className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-sm text-[var(--vo-fg)]">
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
