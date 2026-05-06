"use client";

import { useState } from "react";
import type { WorkspaceCtx } from "./types";

function Dot({ status }: { status: string }) {
  const ok = status === "online";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-[var(--vo-ok)]" : "bg-[var(--vo-danger)]"}`}
    />
  );
}

export function TabOprema({ ctx }: { ctx: WorkspaceCtx }) {
  const { dbConfigured, reload } = ctx;
  const [busy, setBusy] = useState(false);

  async function pingAll() {
    if (!dbConfigured) return;
    setBusy(true);
    await fetch(`/api/clients/${ctx.clientId}/reachability`, { method: "POST" });
    setBusy(false);
    await reload();
  }

  async function post(path: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/clients/${ctx.clientId}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok;
  }

  async function del(path: string) {
    await fetch(`/api/clients/${ctx.clientId}${path}`, { method: "DELETE" });
  }

  async function patch(path: string, body: Record<string, unknown>) {
    await fetch(`/api/clients/${ctx.clientId}${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="space-y-8">
      {!dbConfigured ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          Shranjevanje zahteva bazo.
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy || !dbConfigured}
          onClick={() => void pingAll()}
          className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-3 py-2 text-xs font-medium text-[var(--vo-fg)] disabled:opacity-40"
        >
          {busy ? "Preverjam dosegljivost…" : "Preveri dosegljivost opreme"}
        </button>
      </div>

      <RecorderBlock ctx={ctx} busy={busy} setBusy={setBusy} post={post} patch={patch} del={del} reload={reload} dbConfigured={dbConfigured} />
      <SwitchBlock ctx={ctx} busy={busy} setBusy={setBusy} post={post} patch={patch} del={del} reload={reload} dbConfigured={dbConfigured} />
      <DiskBlock ctx={ctx} busy={busy} setBusy={setBusy} post={post} patch={patch} del={del} reload={reload} dbConfigured={dbConfigured} />
    </div>
  );
}

function RecorderBlock({
  ctx,
  busy,
  setBusy,
  post,
  patch,
  del,
  reload,
  dbConfigured,
}: {
  ctx: WorkspaceCtx;
  busy: boolean;
  setBusy: (v: boolean) => void;
  post: (p: string, b: Record<string, unknown>) => Promise<boolean>;
  patch: (p: string, b: Record<string, unknown>) => Promise<void>;
  del: (p: string) => Promise<void>;
  reload: () => Promise<void>;
  dbConfigured: boolean;
}) {
  const [f, setF] = useState({ name: "", ip: "", model: "", comment: "" });
  const [edit, setEdit] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !dbConfigured) return;
    setBusy(true);
    await post("/recorders", { ...f, diskTb: 0 });
    setBusy(false);
    setF({ name: "", ip: "", model: "", comment: "" });
    await reload();
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Snemalniki</h3>
      <form onSubmit={add} className="flex flex-wrap gap-2 text-xs">
        <input placeholder="Ime" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="IP" value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5 font-mono" />
        <input placeholder="Model" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="Komentar" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} className="min-w-[140px] flex-1 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <button type="submit" disabled={busy || !dbConfigured} className="rounded-lg bg-[var(--vo-fg)] px-3 py-1.5 font-semibold text-[var(--vo-bg)] disabled:opacity-40">+</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-[var(--vo-border)]">
        <table className="min-w-[820px] w-full text-left text-xs">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-2 py-2">STATUS</th>
              <th className="px-2 py-2">IME</th>
              <th className="px-2 py-2">IP</th>
              <th className="px-2 py-2">MODEL</th>
              <th className="px-2 py-2">KOMENTAR</th>
              <th className="px-2 py-2 text-right">AKCIJE</th>
            </tr>
          </thead>
          <tbody>
            {ctx.client.nvrs.map((r) => (
              <tr key={r.id} className={`border-b border-[var(--vo-border)] ${r.status !== "online" ? "bg-red-950/15" : ""}`}>
                <td className="px-2 py-2"><Dot status={r.status} /></td>
                <td className="px-2 py-2 text-[var(--vo-fg)]">
                {edit === r.id ? (
                  <input defaultValue={r.name} id={`rn-${r.id}`} className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1" />
                ) : (
                  r.name
                )}
              </td>
              <td className="px-2 py-2 font-mono text-[var(--vo-muted)]">
                {edit === r.id ? (
                  <input defaultValue={r.ip} id={`rip-${r.id}`} className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1" />
                ) : (
                  r.ip
                )}
              </td>
              <td className="px-2 py-2 text-[var(--vo-muted)]">
                {edit === r.id ? (
                  <input defaultValue={r.model} id={`rm-${r.id}`} className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1" />
                ) : (
                  r.model || "—"
                )}
              </td>
              <td className="px-2 py-2 text-[var(--vo-muted)]">
                {edit === r.id ? (
                  <input defaultValue={r.comment ?? ""} id={`rc-${r.id}`} className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1" />
                ) : (
                  r.comment || "—"
                )}
              </td>
              <td className="px-2 py-2 text-right">
                {edit === r.id ? (
                  <button
                    type="button"
                    className="text-[var(--vo-ok)] hover:underline"
                    onClick={() => {
                      const name = (document.getElementById(`rn-${r.id}`) as HTMLInputElement).value;
                      const ip = (document.getElementById(`rip-${r.id}`) as HTMLInputElement).value;
                      const model = (document.getElementById(`rm-${r.id}`) as HTMLInputElement).value;
                      const comment = (document.getElementById(`rc-${r.id}`) as HTMLInputElement).value;
                      void patch(`/recorders/${r.id}`, { name, ip, model, comment }).then(() => {
                        setEdit(null);
                        void reload();
                      });
                    }}
                  >
                    Shrani
                  </button>
                ) : (
                  <button type="button" className="text-[var(--vo-accent)] hover:underline" onClick={() => setEdit(r.id)}>Uredi</button>
                )}
                <button
                  type="button"
                  disabled={!dbConfigured}
                  className="ml-2 text-red-500 hover:underline disabled:opacity-40"
                  onClick={() => {
                    if (!confirm("Izbris?")) return;
                    void del(`/recorders/${r.id}`).then(() => reload());
                  }}
                >
                  Izbriši
                </button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SwitchBlock({
  ctx,
  busy,
  setBusy,
  post,
  patch,
  del,
  reload,
  dbConfigured,
}: {
  ctx: WorkspaceCtx;
  busy: boolean;
  setBusy: (v: boolean) => void;
  post: (p: string, b: Record<string, unknown>) => Promise<boolean>;
  patch: (p: string, b: Record<string, unknown>) => Promise<void>;
  del: (p: string) => Promise<void>;
  reload: () => Promise<void>;
  dbConfigured: boolean;
}) {
  const [f, setF] = useState({ name: "", ip: "", model: "", comment: "", ports: 0 });
  const [edit, setEdit] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !dbConfigured) return;
    setBusy(true);
    await post("/switches", f);
    setBusy(false);
    setF({ name: "", ip: "", model: "", comment: "", ports: 0 });
    await reload();
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Switchi</h3>
      <form onSubmit={add} className="flex flex-wrap gap-2 text-xs">
        <input placeholder="Ime" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="IP" value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5 font-mono" />
        <input placeholder="Model" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="Komentar" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} className="min-w-[140px] flex-1 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input type="number" placeholder="Ports" value={f.ports || ""} onChange={(e) => setF({ ...f, ports: Number(e.target.value) || 0 })} className="w-20 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <button type="submit" disabled={busy || !dbConfigured} className="rounded-lg bg-[var(--vo-fg)] px-3 py-1.5 font-semibold text-[var(--vo-bg)] disabled:opacity-40">+</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-[var(--vo-border)]">
        <table className="min-w-[820px] w-full text-left text-xs">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-2 py-2">STATUS</th>
              <th className="px-2 py-2">IME</th>
              <th className="px-2 py-2">IP</th>
              <th className="px-2 py-2">MODEL</th>
              <th className="px-2 py-2">KOMENTAR</th>
              <th className="px-2 py-2 text-right">AKCIJE</th>
            </tr>
          </thead>
          <tbody>
            {ctx.client.switches.map((s) => (
              <tr key={s.id} className={`border-b border-[var(--vo-border)] ${s.status !== "online" ? "bg-red-950/15" : ""}`}>
                <td className="px-2 py-2"><Dot status={s.status} /></td>
                <td className="px-2 py-2">
                {edit === s.id ? <input defaultValue={s.name} id={`sn-${s.id}`} className="rounded border border-[var(--vo-border)] bg-transparent px-1" /> : s.name}
              </td>
              <td className="px-2 py-2 font-mono">
                {edit === s.id ? <input defaultValue={s.ip} id={`sip-${s.id}`} className="rounded border border-[var(--vo-border)] bg-transparent px-1" /> : s.ip}
              </td>
              <td className="px-2 py-2">
                {edit === s.id ? <input defaultValue={s.model} id={`sm-${s.id}`} className="rounded border border-[var(--vo-border)] bg-transparent px-1" /> : s.model || "—"}
              </td>
              <td className="px-2 py-2">
                {edit === s.id ? <input defaultValue={s.comment ?? ""} id={`sc-${s.id}`} className="rounded border border-[var(--vo-border)] bg-transparent px-1" /> : s.comment || "—"}
              </td>
              <td className="px-2 py-2 text-right">
                {edit === s.id ? (
                  <button type="button" className="text-[var(--vo-ok)] hover:underline" onClick={() => {
                    void patch(`/switches/${s.id}`, {
                      name: (document.getElementById(`sn-${s.id}`) as HTMLInputElement).value,
                      ip: (document.getElementById(`sip-${s.id}`) as HTMLInputElement).value,
                      model: (document.getElementById(`sm-${s.id}`) as HTMLInputElement).value,
                      comment: (document.getElementById(`sc-${s.id}`) as HTMLInputElement).value,
                    }).then(() => { setEdit(null); void reload(); });
                  }}>Shrani</button>
                ) : (
                  <button type="button" className="text-[var(--vo-accent)] hover:underline" onClick={() => setEdit(s.id)}>Uredi</button>
                )}
                <button type="button" disabled={!dbConfigured} className="ml-2 text-red-500 hover:underline disabled:opacity-40" onClick={() => { if (confirm("Izbris?")) void del(`/switches/${s.id}`).then(() => reload()); }}>Izbriši</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DiskBlock({
  ctx,
  busy,
  setBusy,
  post,
  patch,
  del,
  reload,
  dbConfigured,
}: {
  ctx: WorkspaceCtx;
  busy: boolean;
  setBusy: (v: boolean) => void;
  post: (p: string, b: Record<string, unknown>) => Promise<boolean>;
  patch: (p: string, b: Record<string, unknown>) => Promise<void>;
  del: (p: string) => Promise<void>;
  reload: () => Promise<void>;
  dbConfigured: boolean;
}) {
  const [f, setF] = useState({ label: "", ip: "", model: "", serial: "", sizeTb: 0, installedAt: "", comment: "" });
  const [edit, setEdit] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.label.trim() || !dbConfigured) return;
    setBusy(true);
    await post("/disks", { ...f });
    setBusy(false);
    setF({ label: "", ip: "", model: "", serial: "", sizeTb: 0, installedAt: "", comment: "" });
    await reload();
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Diski</h3>
      <form onSubmit={add} className="flex flex-wrap gap-2 text-xs">
        <input placeholder="Ime" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="IP" value={f.ip} onChange={(e) => setF({ ...f, ip: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5 font-mono" />
        <input placeholder="Model" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="Serijska" value={f.serial} onChange={(e) => setF({ ...f, serial: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input type="number" placeholder="TB" value={f.sizeTb || ""} onChange={(e) => setF({ ...f, sizeTb: Number(e.target.value) || 0 })} className="w-16 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="Montaža (datum)" value={f.installedAt} onChange={(e) => setF({ ...f, installedAt: e.target.value })} className="rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <input placeholder="Komentar" value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} className="min-w-[120px] flex-1 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1.5" />
        <button type="submit" disabled={busy || !dbConfigured} className="rounded-lg bg-[var(--vo-fg)] px-3 py-1.5 font-semibold text-[var(--vo-bg)] disabled:opacity-40">+</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-[var(--vo-border)]">
        <table className="min-w-[980px] w-full text-left text-xs">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-2 py-2">STATUS</th>
              <th className="px-2 py-2">DISK</th>
              <th className="px-2 py-2">IP</th>
              <th className="px-2 py-2">MODEL</th>
              <th className="px-2 py-2">TB</th>
              <th className="px-2 py-2">MONTAŽA</th>
              <th className="px-2 py-2">ZDRAVJE</th>
              <th className="px-2 py-2 text-right">AKCIJE</th>
            </tr>
          </thead>
          <tbody>
            {ctx.client.disks.map((d) => (
              <tr key={d.id} className={`border-b border-[var(--vo-border)] ${d.health !== "ok" ? "bg-red-950/15" : ""}`}>
                <td className="px-2 py-2"><Dot status={d.health === "ok" ? "online" : "offline"} /></td>
                <td className="px-2 py-2 text-[var(--vo-fg)]">
                {edit === d.id ? <input defaultValue={d.label} id={`dl-${d.id}`} className="rounded border px-1" /> : d.label}
              </td>
              <td className="px-2 py-2 font-mono text-[var(--vo-muted)]">
                {edit === d.id ? <input defaultValue={d.ip ?? ""} id={`dip-${d.id}`} className="rounded border px-1" /> : d.ip || "—"}
              </td>
              <td className="px-2 py-2">
                {edit === d.id ? <input defaultValue={d.model ?? ""} id={`dm-${d.id}`} className="rounded border px-1" /> : d.model || "—"}
              </td>
              <td className="px-2 py-2">{d.sizeTb}</td>
              <td className="px-2 py-2 text-[var(--vo-muted)]">{d.installedAt || <span className="italic">Ni datuma</span>}</td>
              <td className="px-2 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${d.health === "ok" ? "bg-[var(--vo-ok-muted)] text-[var(--vo-ok)]" : "bg-[var(--vo-danger-muted)] text-[var(--vo-danger)]"}`}>
                  {d.health === "ok" ? "Vse OK" : d.health}
                </span>
              </td>
              <td className="px-2 py-2 text-right">
                {edit === d.id ? (
                  <button type="button" className="text-[var(--vo-ok)] hover:underline" onClick={() => {
                    void patch(`/disks/${d.id}`, {
                      label: (document.getElementById(`dl-${d.id}`) as HTMLInputElement).value,
                      ip: (document.getElementById(`dip-${d.id}`) as HTMLInputElement).value,
                      model: (document.getElementById(`dm-${d.id}`) as HTMLInputElement).value,
                    }).then(() => { setEdit(null); void reload(); });
                  }}>Shrani</button>
                ) : (
                  <button type="button" className="text-[var(--vo-accent)] hover:underline" onClick={() => setEdit(d.id)}>Uredi</button>
                )}
                <button type="button" disabled={!dbConfigured} className="ml-2 text-red-500 hover:underline disabled:opacity-40" onClick={() => { if (confirm("Izbris?")) void del(`/disks/${d.id}`).then(() => reload()); }}>Izbriši</button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
