"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePortalToast } from "@/context/PortalToastContext";
import { parseTopologyState } from "@/lib/topology-parse";
import type { ClientTopologyState, TopologyCanvasNode, TopologyDeviceKind } from "@/lib/types";
import type { WorkspaceCtx } from "./types";

type DragPayload = { kind: TopologyDeviceKind; id: string; label: string };
type PaletteItem = DragPayload & { status: "online" | "offline" };

function Dot({ status }: { status: "online" | "offline" }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        status === "online" ? "bg-[var(--vo-ok)]" : "bg-[var(--vo-danger)]"
      }`}
    />
  );
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `n-${Date.now()}`;
}

export function TabShema({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { client, clientId, dbConfigured, reload, applyClient } = ctx;
  const [topo, setTopo] = useState<ClientTopologyState>(() => parseTopologyState(client.topologyData));
  const [liveCamStatus, setLiveCamStatus] = useState<
    Record<string, { status: string; lastSeenAt: string | null; latencyMs: number | null; lastError: string }>
  >({});
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTopo(parseTopologyState(client.topologyData));
  }, [client.topologyData]);

  useEffect(() => {
    if (!dbConfigured) return;
    let stopped = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/clients/${clientId}/camera-status`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as {
          statusByCameraId: Record<
            string,
            { status: string; lastSeenAt: string | null; latencyMs: number | null; lastError: string }
          >;
        };
        if (!stopped) setLiveCamStatus(j.statusByCameraId ?? {});
      } catch {
        // ignore intermittent poll errors
      }
    };
    void tick();
    const id = window.setInterval(tick, 10_000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [clientId, dbConfigured]);

  const palette: { title: string; items: PaletteItem[] }[] = [
    {
      title: "Kamere",
      items: client.cameras.map((c) => ({
        kind: "camera" as const,
        id: c.id,
        label: `${c.tag ? `${c.tag} ` : ""}${c.name}`.trim(),
        status: c.status === "online" ? "online" : "offline",
      })),
    },
    {
      title: "Snemalniki",
      items: client.nvrs.map((r) => ({
        kind: "recorder" as const,
        id: r.id,
        label: r.name,
        status: r.status === "online" ? "online" : "offline",
      })),
    },
    {
      title: "Switchi",
      items: client.switches.map((s) => ({
        kind: "switch" as const,
        id: s.id,
        label: s.name,
        status: s.status === "online" ? "online" : "offline",
      })),
    },
    {
      title: "Diski",
      items: client.disks.map((d) => ({
        kind: "disk" as const,
        id: d.id,
        label: d.label,
        status: d.health === "ok" ? "online" : "offline",
      })),
    },
  ];

  const onPaletteDragStart = (e: React.DragEvent, item: DragPayload) => {
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw || !canvasRef.current) return;
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left - 48);
    const y = Math.round(e.clientY - rect.top - 20);
    const node: TopologyCanvasNode = {
      id: newId(),
      label: payload.label,
      x: Math.max(20, x),
      y: Math.max(20, y),
      deviceRef: { kind: payload.kind, id: payload.id },
    };
    setTopo((t) => ({ ...t, nodes: [...t.nodes, node] }));
  };

  const onNodeClick = (id: string) => {
    if (!connectFrom) {
      setConnectFrom(id);
      return;
    }
    if (connectFrom === id) {
      setConnectFrom(null);
      return;
    }
    const exists = topo.edges.some(
      (e) => (e.from === connectFrom && e.to === id) || (e.from === id && e.to === connectFrom),
    );
    if (!exists) {
      setTopo((t) => ({ ...t, edges: [...t.edges, { from: connectFrom, to: id }] }));
    }
    setConnectFrom(null);
  };

  const removeNode = (id: string) => {
    setTopo((t) => ({
      ...t,
      nodes: t.nodes.filter((n) => n.id !== id),
      edges: t.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const clearBg = () => setTopo((t) => ({ ...t, backgroundSrc: null }));
  const clearAll = () => setTopo((t) => ({ ...t, nodes: [], edges: [] }));
  const removeEdge = (idx: number) =>
    setTopo((t) => ({ ...t, edges: t.edges.filter((_, i) => i !== idx) }));

  const rotateNode = (id: string, delta: number) => {
    setTopo((t) => ({
      ...t,
      nodes: t.nodes.map((n) =>
        n.id === id ? { ...n, rotationDeg: (((n.rotationDeg ?? 0) + delta) % 360 + 360) % 360 } : n,
      ),
    }));
  };

  const getCameraStatus = (cameraId: string): "online" | "offline" => {
    const live = liveCamStatus[cameraId]?.status;
    if (live) return live === "online" ? "online" : "offline";
    return client.cameras.find((c) => c.id === cameraId)?.status === "online" ? "online" : "offline";
  };

  const onBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : null;
      setTopo((t) => ({ ...t, backgroundSrc: src }));
    };
    reader.readAsDataURL(file);
  };

  const save = useCallback(async () => {
    if (!dbConfigured) return;
    const r = await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topologyData: topo }),
    });
    if (!r.ok) {
      showToast("Shranjevanje načrta ni uspelo.", "err");
      return;
    }
    const j = (await r.json().catch(() => ({}))) as { client?: typeof client };
    if (j.client) applyClient(j.client);
    else await reload();
    showToast("Načrt shranjen.");
  }, [applyClient, clientId, dbConfigured, reload, topo, showToast]);

  useEffect(() => {
    if (!dragging || !canvasRef.current) return;
    const move = (e: PointerEvent) => {
      const el = canvasRef.current;
      if (!el) return;
      const parent = el.getBoundingClientRect();
      const x = Math.round(e.clientX - parent.left - dragging.dx);
      const y = Math.round(e.clientY - parent.top - dragging.dy);
      setTopo((t) => ({
        ...t,
        nodes: t.nodes.map((n) =>
          n.id === dragging.id ? { ...n, x: Math.max(8, x), y: Math.max(8, y) } : n,
        ),
      }));
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="w-full shrink-0 space-y-2 rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs lg:w-56">
        <p className="font-semibold text-[var(--vo-fg)]">Naprave (drag &amp; drop)</p>
        <p className="text-[var(--vo-muted)]">
          Klikni dve napravi na platnu za povezavo. Drugi klik prekliče. Desni klik na kartico — odstrani.
        </p>
        {connectFrom ? (
          <p className="rounded bg-[var(--vo-accent-muted)] px-2 py-1 text-[var(--vo-accent)]">
            Izberite drugo napravo za povezavo…
          </p>
        ) : null}
        {palette.map((g) => (
          <div key={g.title}>
            <div className="mt-2 font-medium text-[var(--vo-muted)]">{g.title}</div>
            <ul className="mt-1 space-y-1">
              {g.items.map((item) => {
                const status = item.kind === "camera" ? getCameraStatus(item.id) : item.status;
                return (
                <li
                  key={`${item.kind}-${item.id}`}
                  draggable={dbConfigured}
                  onDragStart={(e) => onPaletteDragStart(e, item)}
                  className="flex cursor-grab items-center gap-2 rounded border border-[var(--vo-border)] px-2 py-1 active:cursor-grabbing"
                >
                  <Dot status={status} />
                  {item.label}
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="rounded-lg border border-[var(--vo-border)] px-2 py-1 text-xs hover:bg-[var(--vo-surface-2)]">
            Izberi ozadje
            <input type="file" accept="image/*" className="hidden" onChange={onBgFile} />
          </label>
          <button type="button" onClick={clearBg} className="text-xs text-[var(--vo-muted)] hover:text-[var(--vo-danger)]">
            Odstrani ozadje
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[var(--vo-muted)] hover:text-[var(--vo-danger)]"
          >
            Počisti platno
          </button>
          <span className="ml-auto text-xs text-[var(--vo-muted)]">Čvorov ({topo.nodes.length})</span>
          {selectedNodeId ? (
            <>
              <button
                type="button"
                onClick={() => rotateNode(selectedNodeId, -15)}
                className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
              >
                Obrni -15°
              </button>
              <button
                type="button"
                onClick={() => rotateNode(selectedNodeId, 15)}
                className="rounded border border-[var(--vo-border)] px-2 py-1 text-xs text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
              >
                Obrni +15°
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={!dbConfigured}
            onClick={() => void save()}
            className="rounded-lg bg-[var(--vo-accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Shrani načrt
          </button>
        </div>

        <div
          ref={canvasRef}
          className="relative min-h-[420px] overflow-hidden rounded-xl border border-[var(--vo-border)] bg-[var(--vo-bg)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
        >
          {topo.backgroundSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={topo.backgroundSrc}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-35"
            />
          ) : null}

          <svg className="absolute inset-0 h-full w-full">
            {topo.edges.map((edge, i) => {
              const a = topo.nodes.find((n) => n.id === edge.from);
              const b = topo.nodes.find((n) => n.id === edge.to);
              if (!a || !b) return null;
              return (
                <line
                  key={`${edge.from}-${edge.to}-${i}`}
                  x1={a.x + 48}
                  y1={a.y + 22}
                  x2={b.x + 48}
                  y2={b.y + 22}
                  stroke="var(--vo-accent)"
                  strokeWidth={2}
                  opacity={0.6}
                />
              );
            })}
          </svg>

          {topo.nodes.map((n) => {
            const isCamera = n.deviceRef?.kind === "camera";
            const camStatus = isCamera && n.deviceRef ? getCameraStatus(n.deviceRef.id) : "offline";
            const camColor = camStatus === "online" ? "var(--vo-ok)" : "var(--vo-danger)";
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={`absolute cursor-pointer select-none ${
                  isCamera ? "w-16" : "w-28 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-[11px] shadow-md"
                } ${connectFrom === n.id ? "ring-2 ring-[var(--vo-accent)]" : ""} ${
                  selectedNodeId === n.id ? "ring-2 ring-[var(--vo-accent)]" : ""
                }`}
                style={{ left: n.x, top: n.y }}
                onClick={() => {
                  setSelectedNodeId(n.id);
                  onNodeClick(n.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  removeNode(n.id);
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDragging({
                    id: n.id,
                    dx: e.clientX - rect.left,
                    dy: e.clientY - rect.top,
                  });
                }}
              >
                {isCamera ? (
                  <div className="flex flex-col items-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8 drop-shadow-md"
                      aria-hidden="true"
                      style={{ transform: `rotate(${n.rotationDeg ?? 0}deg)` }}
                    >
                      <rect x="3" y="7" width="14" height="10" rx="2" fill={camColor} opacity="0.2" />
                      <rect x="3" y="7" width="14" height="10" rx="2" fill="none" stroke={camColor} strokeWidth="1.7" />
                      <path d="M17 10l4-2v8l-4-2z" fill={camColor} opacity="0.35" />
                      <path d="M7 7V5h6v2" fill="none" stroke={camColor} strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <div className="mt-1 w-full truncate text-center text-[10px] font-medium text-[var(--vo-fg)]">{n.label}</div>
                    <div className="w-full truncate text-center font-mono text-[10px] text-[var(--vo-muted)]">
                      {n.deviceRef ? client.cameras.find((c) => c.id === n.deviceRef?.id)?.ip ?? "" : ""}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="truncate font-medium text-[var(--vo-fg)]">{n.label}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-3 text-xs">
          <p className="font-medium text-[var(--vo-fg)]">Povezave</p>
          <ul className="mt-2 space-y-1">
            {topo.edges.map((e, i) => {
              const from = topo.nodes.find((n) => n.id === e.from)?.label ?? e.from;
              const to = topo.nodes.find((n) => n.id === e.to)?.label ?? e.to;
              return (
                <li key={`${e.from}-${e.to}-${i}`} className="flex items-center justify-between gap-2 rounded border border-[var(--vo-border)] px-2 py-1">
                  <span className="truncate text-[var(--vo-muted)]">{from} → {to}</span>
                  <button type="button" className="text-red-500 hover:underline" onClick={() => removeEdge(i)}>
                    Izbriši
                  </button>
                </li>
              );
            })}
            {topo.edges.length === 0 ? (
              <li className="text-[var(--vo-muted)]">Ni povezav.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
