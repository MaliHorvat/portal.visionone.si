"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EthernetPort, HardDrive, Video } from "lucide-react";
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

function DeviceGlyph({
  kind,
  status,
  rotationDeg,
}: {
  kind: TopologyDeviceKind | undefined;
  status: "online" | "offline";
  rotationDeg?: number;
}) {
  const color = status === "online" ? "var(--vo-ok)" : "var(--vo-danger)";
  const className = "h-8 w-8 drop-shadow-md";
  const style = { color, transform: `rotate(${rotationDeg ?? 0}deg)` };
  if (kind === "camera") return <Video className={className} style={style} aria-hidden />;
  if (kind === "switch") return <EthernetPort className={className} style={style} aria-hidden />;
  return <HardDrive className={className} style={style} aria-hidden />;
}

export function TabShema({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { client, clientId, dbConfigured, reload, applyClient } = ctx;
  const [topo, setTopo] = useState<ClientTopologyState>(() => parseTopologyState(client.topologyData));
  const [liveStatus, setLiveStatus] = useState<{
    cameras: Record<string, { status: string }>;
    recorders: Record<string, { status: string }>;
    switches: Record<string, { status: string }>;
  }>({ cameras: {}, recorders: {}, switches: {} });
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [linePreview, setLinePreview] = useState<{ x: number; y: number } | null>(null);
  const [selectedPathIdx, setSelectedPathIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTopo(parseTopologyState(client.topologyData));
  }, [client.topologyData]);

  useEffect(() => {
    if (!dbConfigured) return;
    let stopped = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/clients/${clientId}/device-status`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as {
          cameras: Record<string, { status: string }>;
          recorders: Record<string, { status: string }>;
          switches: Record<string, { status: string }>;
        };
        if (!stopped) setLiveStatus(j);
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
    if (!editMode) return;
    e.dataTransfer.setData("application/json", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onCanvasDrop = (e: React.DragEvent) => {
    if (!editMode) return;
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
    if (!editMode) return;
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

  const clearAll = () => {
    if (!editMode) return;
    if (!confirm("Res želite počistiti celotno shemo (vozlišča + povezave + risbo)?")) return;
    setTopo((t) => ({ ...t, nodes: [], edges: [], floorPlanPaths: [] }));
  };
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

  const getDeviceStatus = (kind: TopologyDeviceKind, id: string): "online" | "offline" => {
    if (kind === "camera") {
      const st = liveStatus.cameras[id]?.status ?? client.cameras.find((c) => c.id === id)?.status;
      return st === "online" ? "online" : "offline";
    }
    if (kind === "recorder") {
      const st = liveStatus.recorders[id]?.status ?? client.nvrs.find((r) => r.id === id)?.status;
      return st === "online" ? "online" : "offline";
    }
    if (kind === "switch") {
      const st = liveStatus.switches[id]?.status ?? client.switches.find((s) => s.id === id)?.status;
      return st === "online" ? "online" : "offline";
    }
    return "offline";
  };

  const startDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setLineStart(start);
    setLinePreview(start);
  };
  const moveDraw = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editMode || !lineStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setLinePreview({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const endDraw = () => {
    if (!editMode || !lineStart || !linePreview) return;
    const dx = Math.abs(linePreview.x - lineStart.x);
    const dy = Math.abs(linePreview.y - lineStart.y);
    // Snap na ravno horizontalno ali vertikalno črto.
    const snapped =
      dx >= dy
        ? { x: linePreview.x, y: lineStart.y }
        : { x: lineStart.x, y: linePreview.y };
    if (Math.hypot(snapped.x - lineStart.x, snapped.y - lineStart.y) > 2) {
      setTopo((t) => ({
        ...t,
        floorPlanPaths: [...(t.floorPlanPaths ?? []), { points: [lineStart, snapped] }],
      }));
    }
    setLineStart(null);
    setLinePreview(null);
  };
  const clearDrawing = () => {
    if (!editMode) return;
    if (!confirm("Res želite počistiti narisan tloris?")) return;
    setTopo((t) => ({ ...t, floorPlanPaths: [] }));
    setSelectedPathIdx(null);
  };

  const removeSelectedPath = () => {
    if (!editMode || selectedPathIdx === null) return;
    setTopo((t) => ({
      ...t,
      floorPlanPaths: (t.floorPlanPaths ?? []).filter((_, i) => i !== selectedPathIdx),
    }));
    setSelectedPathIdx(null);
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
                const status = item.kind === "camera" || item.kind === "recorder" || item.kind === "switch"
                  ? getDeviceStatus(item.kind, item.id)
                  : item.status;
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
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`rounded-lg border px-2 py-1 text-xs ${
              editMode ? "border-[var(--vo-accent)] text-[var(--vo-accent)]" : "border-[var(--vo-border)] text-[var(--vo-muted)]"
            }`}
          >
            {editMode ? "Način urejanja: VKLOPLJEN" : "Način urejanja: IZKLOPLJEN"}
          </button>
          <button
            type="button"
            disabled={!editMode}
            onClick={clearDrawing}
            className="text-xs text-[var(--vo-muted)] hover:text-[var(--vo-danger)] disabled:opacity-40"
          >
            Počisti risbo
          </button>
          <button
            type="button"
            disabled={!editMode || selectedPathIdx === null}
            onClick={removeSelectedPath}
            className="text-xs text-[var(--vo-muted)] hover:text-[var(--vo-danger)] disabled:opacity-40"
          >
            Izbriši izbrano črto
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!editMode}
            className="text-xs text-[var(--vo-muted)] hover:text-[var(--vo-danger)] disabled:opacity-40"
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
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        >
          <svg className="absolute inset-0 h-full w-full">
            {(topo.floorPlanPaths ?? []).map((path, i) => (
              <polyline
                key={`fp-${i}`}
                points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={selectedPathIdx === i ? "rgba(56, 189, 248, 0.95)" : "rgba(148, 163, 184, 0.8)"}
                strokeWidth={selectedPathIdx === i ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={editMode ? "cursor-pointer" : undefined}
                onClick={(e) => {
                  if (!editMode) return;
                  e.stopPropagation();
                  setSelectedPathIdx(i);
                }}
              />
            ))}
            {lineStart && linePreview ? (
              <polyline
                points={`${lineStart.x},${lineStart.y} ${
                  Math.abs(linePreview.x - lineStart.x) >= Math.abs(linePreview.y - lineStart.y)
                    ? `${linePreview.x},${lineStart.y}`
                    : `${lineStart.x},${linePreview.y}`
                }`}
                fill="none"
                stroke="rgba(56, 189, 248, 0.9)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
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
            const kind = n.deviceRef?.kind;
            const isCamera = kind === "camera";
            const isRecorder = kind === "recorder";
            const isSwitch = kind === "switch";
            const st = kind && n.deviceRef ? getDeviceStatus(kind, n.deviceRef.id) : "offline";
            const color = st === "online" ? "var(--vo-ok)" : "var(--vo-danger)";
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={`absolute cursor-pointer select-none ${
                  isCamera || isRecorder || isSwitch
                    ? "w-16"
                    : "w-28 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 py-2 text-[11px] shadow-md"
                } ${connectFrom === n.id ? "ring-2 ring-[var(--vo-accent)]" : ""} ${
                  selectedNodeId === n.id ? "ring-2 ring-[var(--vo-accent)]" : ""
                }`}
                style={{ left: n.x, top: n.y }}
                onClick={() => {
                  setSelectedNodeId(n.id);
                  onNodeClick(n.id);
                }}
                onContextMenu={(e) => {
                  if (!editMode) return;
                  e.preventDefault();
                  removeNode(n.id);
                }}
                onPointerDown={(e) => {
                  if (!editMode) return;
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
                {isCamera || isRecorder || isSwitch ? (
                  <div className="flex flex-col items-center">
                    <DeviceGlyph kind={kind} status={st} rotationDeg={n.rotationDeg} />
                    <div className="mt-1 w-full truncate text-center text-[10px] font-medium text-[var(--vo-fg)]">{n.label}</div>
                    <div className="w-full truncate text-center font-mono text-[10px] text-[var(--vo-muted)]">
                      {n.deviceRef?.kind === "camera"
                        ? client.cameras.find((c) => c.id === n.deviceRef?.id)?.ip ?? ""
                        : n.deviceRef?.kind === "recorder"
                          ? client.nvrs.find((r) => r.id === n.deviceRef?.id)?.ip ?? ""
                          : n.deviceRef?.kind === "switch"
                            ? client.switches.find((s) => s.id === n.deviceRef?.id)?.ip ?? ""
                            : ""}
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
