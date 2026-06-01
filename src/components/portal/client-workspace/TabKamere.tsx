"use client";

import { useEffect, useState } from "react";
import { PortalContextMenu, type ContextMenuItem } from "@/components/portal/PortalContextMenu";
import { usePortalToast } from "@/context/PortalToastContext";
import type { WorkspaceCtx } from "./types";

function StatusDot({ status }: { status: string }) {
  const ok = status === "online";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ok ? "bg-[var(--vo-ok)]" : "bg-[var(--vo-danger)]"}`}
      title={status}
    />
  );
}

export function TabKamere({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { client, dbConfigured, reload } = ctx;
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [live, setLive] = useState<
    Record<string, { status: string; lastSeenAt: string | null; latencyMs: number | null; lastError: string }>
  >({});
  const [form, setForm] = useState({
    tag: "",
    name: "",
    ip: "",
    rtspUser: "",
    rtspPass: "",
    model: "",
    comment: "",
  });
  const [bulkUser, setBulkUser] = useState("");
  const [bulkPass, setBulkPass] = useState("");
  const [bulkOnlyEmpty, setBulkOnlyEmpty] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; camId: string } | null>(null);

  useEffect(() => {
    if (!dbConfigured) return;
    let stopped = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/clients/${ctx.clientId}/camera-status`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as {
          statusByCameraId: Record<
            string,
            { status: string; lastSeenAt: string | null; latencyMs: number | null; lastError: string }
          >;
        };
        if (!stopped) setLive(j.statusByCameraId ?? {});
      } catch {
        // ignore intermittent network/UI polling errors
      }
    };
    void tick();
    const id = window.setInterval(tick, 10_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [ctx.clientId, dbConfigured]);

  async function checkAll() {
    if (!dbConfigured) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${ctx.clientId}/reachability`, { method: "POST" });
    setBusy(false);
    if (!r.ok) {
      showToast("Preverjanje dosegljivosti ni uspelo.", "err");
      return;
    }
    await reload();
    showToast("Stanje kamer posodobljeno.");
  }

  async function addCamera(e: React.FormEvent) {
    e.preventDefault();
    if (!dbConfigured || !form.name.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${ctx.clientId}/cameras`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Dodajanje kamere ni uspelo.", "err");
      return;
    }
    setForm({ tag: "", name: "", ip: "", rtspUser: "", rtspPass: "", model: "", comment: "" });
    await reload();
    showToast("Kamera dodana.");
  }

  async function deleteCam(id: string) {
    if (!confirm("Izbris kamere?")) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${ctx.clientId}/cameras/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) {
      showToast("Brisanje kamere ni uspelo.", "err");
      return;
    }
    await reload();
    showToast("Kamera izbrisana.");
  }

  async function applyCredentialsToAll() {
    if (!dbConfigured) return;
    if (!bulkUser.trim() && !bulkPass) {
      showToast("Vnesite uporabniško ime ali geslo.", "err");
      return;
    }
    if (!confirm(`Posodobim RTSP podatke za ${bulkOnlyEmpty ? "kamere brez podatkov" : "vse kamere"}?`)) return;
    setBusy(true);
    const r = await fetch(`/api/clients/${ctx.clientId}/cameras/bulk-credentials`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rtspUser: bulkUser.trim(),
        rtspPass: bulkPass,
        onlyEmpty: bulkOnlyEmpty,
      }),
    });
    setBusy(false);
    const j = (await r.json()) as { updated?: number; error?: string };
    if (!r.ok) {
      showToast(j.error ?? "Množično posodabljanje ni uspelo.", "err");
      return;
    }
    await reload();
    showToast(`Posodobljenih ${j.updated ?? 0} kamer.`);
  }

  async function saveCam(id: string, patch: Record<string, string>) {
    setBusy(true);
    const r = await fetch(`/api/clients/${ctx.clientId}/cameras/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (!r.ok) {
      showToast("Shranjevanje kamere ni uspelo.", "err");
      return;
    }
    setEditId(null);
    await reload();
    showToast("Kamera shranjena.");
  }

  function openCameraMenu(e: React.MouseEvent, camId: string) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, camId });
  }

  function cameraItems(camId: string): ContextMenuItem[] {
    return [
      { id: "edit", label: "Uredi", onClick: () => setEditId(camId) },
      {
        id: "check",
        label: "Preveri dosegljivost vseh",
        disabled: busy || !dbConfigured,
        onClick: () => void checkAll(),
      },
      {
        id: "delete",
        label: "Izbriši",
        danger: true,
        disabled: busy || !dbConfigured,
        onClick: () => void deleteCam(camId),
      },
    ];
  }

  return (
    <div className="space-y-4">
      {!dbConfigured ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          Shranjevanje zahteva nastavljeno bazo (DATABASE_URL).
        </p>
      ) : null}

      {client.cameras.length > 0 ? (
        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs shadow-[var(--vo-card-shadow)]">
          <p className="mb-2 font-semibold text-[var(--vo-fg)]">Izpolni uporabniško ime in geslo za vse kamere</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[var(--vo-muted)]">
              <span className="vo-field-label">RTSP uporabnik</span>
              <input
                placeholder="admin"
                value={bulkUser}
                onChange={(e) => setBulkUser(e.target.value)}
                className="vo-input vo-input-touch mt-1 w-full min-w-[120px] font-mono"
              />
            </label>
            <label className="text-[var(--vo-muted)]">
              <span className="vo-field-label">RTSP geslo</span>
              <input
                type="password"
                placeholder="geslo"
                value={bulkPass}
                onChange={(e) => setBulkPass(e.target.value)}
                className="vo-input vo-input-touch mt-1 w-full min-w-[120px]"
              />
            </label>
            <label className="flex min-h-[2.75rem] items-center gap-2 self-end text-[var(--vo-muted)]">
              <input
                type="checkbox"
                checked={bulkOnlyEmpty}
                onChange={(e) => setBulkOnlyEmpty(e.target.checked)}
                className="h-4 w-4"
              />
              Samo prazne vnose
            </label>
            <button
              type="button"
              disabled={busy || !dbConfigured}
              onClick={() => void applyCredentialsToAll()}
              className="vo-touch-btn vo-btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Uporabi za vse kamere
            </button>
            <button
              type="button"
              disabled={busy || !dbConfigured}
              className="vo-touch-btn vo-btn-secondary px-3 py-2 text-sm disabled:opacity-40"
              onClick={() => {
                setForm((f) => ({ ...f, rtspUser: bulkUser, rtspPass: bulkPass }));
                showToast("Vrednosti kopirane v obrazec za novo kamero.");
              }}
            >
              Kopiraj v nov vnos
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={addCamera}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs shadow-[var(--vo-card-shadow)]"
      >
        <input
          placeholder="Oznaka"
          value={form.tag}
          onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
          className="min-w-[72px] flex-1 vo-select px-2 py-1 text-xs.5"
        />
        <input
          placeholder="Ime"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="min-w-[100px] flex-1 vo-select px-2 py-1 text-xs.5"
        />
        <input
          placeholder="IP"
          value={form.ip}
          onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
          className="min-w-[110px] flex-1 vo-select px-2 py-1 text-xs.5 font-mono"
        />
        <input
          placeholder="User"
          value={form.rtspUser}
          onChange={(e) => setForm((f) => ({ ...f, rtspUser: e.target.value }))}
          className="min-w-[72px] flex-1 vo-select px-2 py-1 text-xs.5"
        />
        <input
          placeholder="Pass"
          type="password"
          value={form.rtspPass}
          onChange={(e) => setForm((f) => ({ ...f, rtspPass: e.target.value }))}
          className="min-w-[72px] flex-1 vo-select px-2 py-1 text-xs.5"
        />
        <input
          placeholder="Model"
          value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
          className="min-w-[90px] flex-1 vo-select px-2 py-1 text-xs.5"
        />
        <input
          placeholder="Komentar"
          value={form.comment}
          onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          className="min-w-[120px] flex-[2] vo-select px-2 py-1 text-xs.5"
        />
        <button
          type="submit"
          disabled={busy || !dbConfigured}
          className="rounded-lg bg-[var(--vo-fg)] px-3 py-1.5 font-semibold text-[var(--vo-bg)] disabled:opacity-40"
        >
          +
        </button>
      </form>

      <button
        type="button"
        disabled={busy || !dbConfigured}
        onClick={() => void checkAll()}
        className="text-xs font-medium text-[var(--vo-accent)] hover:underline disabled:opacity-40"
      >
        ⚡ Preveri dosegljivost vseh
      </button>

      <div className="overflow-x-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] shadow-[var(--vo-card-shadow)]">
        <table className="min-w-[920px] w-full text-left text-xs">
          <thead className="border-b border-[var(--vo-border)] bg-[var(--vo-surface-2)] text-[var(--vo-muted)]">
            <tr>
              <th className="px-2 py-2">STATUS</th>
              <th className="px-2 py-2">OZNAKA</th>
              <th className="px-2 py-2">IME</th>
              <th className="px-2 py-2">IP</th>
              <th className="px-2 py-2">MODEL</th>
              <th className="px-2 py-2">USER/PASS</th>
              <th className="px-2 py-2">KOMENTAR</th>
              <th className="px-2 py-2 text-right">AKCIJE</th>
            </tr>
          </thead>
          <tbody>
            {client.cameras.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[var(--vo-muted)]">
                  Ni kamer.
                </td>
              </tr>
            ) : null}
            {client.cameras.map((cam) => {
              const liveStatus = live[cam.id]?.status;
              const effectiveStatus = liveStatus || cam.status;
              const offline = effectiveStatus !== "online";
              const editing = editId === cam.id;
              return (
                <tr
                  key={cam.id}
                  className={`border-b border-[var(--vo-border)] ${offline ? "bg-red-950/20" : ""}`}
                  onContextMenu={(e) => openCameraMenu(e, cam.id)}
                >
                  <td className="px-2 py-2">
                    <StatusDot status={effectiveStatus} />
                  </td>
                  <td className="px-2 py-2">
                    {editing ? (
                      <input
                        defaultValue={cam.tag ?? ""}
                        id={`t-${cam.id}`}
                        className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1 py-0.5"
                      />
                    ) : (
                      <span className="text-[var(--vo-fg)]">{cam.tag || "—"}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-[var(--vo-fg)]">
                    {editing ? (
                      <input
                        defaultValue={cam.name}
                        id={`n-${cam.id}`}
                        className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1 py-0.5"
                      />
                    ) : (
                      cam.name
                    )}
                  </td>
                  <td className="px-2 py-2 font-mono text-[var(--vo-muted)]">
                    {editing ? (
                      <input
                        defaultValue={cam.ip}
                        id={`ip-${cam.id}`}
                        className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1 py-0.5"
                      />
                    ) : (
                      cam.ip
                    )}
                  </td>
                  <td className="px-2 py-2 text-[var(--vo-muted)]">
                    {editing ? (
                      <input
                        defaultValue={cam.model}
                        id={`m-${cam.id}`}
                        className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1 py-0.5"
                      />
                    ) : (
                      cam.model || "—"
                    )}
                  </td>
                  <td className="px-2 py-2 text-[var(--vo-muted)]">
                    {editing ? (
                      <span className="flex gap-1">
                        <input
                          defaultValue={cam.rtspUser ?? ""}
                          id={`u-${cam.id}`}
                          className="w-14 rounded border border-[var(--vo-border)] bg-transparent px-1"
                        />
                        <input
                          defaultValue={cam.rtspPass ?? ""}
                          id={`p-${cam.id}`}
                          type="password"
                          className="w-14 rounded border border-[var(--vo-border)] bg-transparent px-1"
                        />
                      </span>
                    ) : (
                      <>
                        {cam.rtspUser || "—"} / {cam.rtspPass ? "••••" : "—"}
                      </>
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-2 py-2 text-[var(--vo-muted)]">
                    {editing ? (
                      <input
                        defaultValue={cam.comment ?? ""}
                        id={`c-${cam.id}`}
                        className="w-full rounded border border-[var(--vo-border)] bg-transparent px-1 py-0.5"
                      />
                    ) : (
                      cam.comment || "—"
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {editing ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="mr-2 text-[var(--vo-ok)] hover:underline"
                        onClick={() => {
                          const tag = (document.getElementById(`t-${cam.id}`) as HTMLInputElement)?.value;
                          const name = (document.getElementById(`n-${cam.id}`) as HTMLInputElement)?.value;
                          const ip = (document.getElementById(`ip-${cam.id}`) as HTMLInputElement)?.value;
                          const model = (document.getElementById(`m-${cam.id}`) as HTMLInputElement)?.value;
                          const rtspUser = (document.getElementById(`u-${cam.id}`) as HTMLInputElement)?.value;
                          const rtspPass = (document.getElementById(`p-${cam.id}`) as HTMLInputElement)?.value;
                          const comment = (document.getElementById(`c-${cam.id}`) as HTMLInputElement)?.value;
                          void saveCam(cam.id, { tag, name, ip, model, rtspUser, rtspPass, comment });
                        }}
                      >
                        Shrani
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-[var(--vo-accent)] hover:underline"
                        onClick={() => setEditId(cam.id)}
                      >
                        Uredi
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || !dbConfigured}
                      className="ml-2 text-red-500 hover:underline disabled:opacity-40"
                      onClick={() => void deleteCam(cam.id)}
                    >
                      Izbriši
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ctxMenu ? (
        <PortalContextMenu
          open
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={cameraItems(ctxMenu.camId)}
        />
      ) : null}
    </div>
  );
}
