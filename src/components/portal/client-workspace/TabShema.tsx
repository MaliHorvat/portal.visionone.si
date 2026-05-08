"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EthernetPort, HardDrive, Video } from "lucide-react";
import { usePortalToast } from "@/context/PortalToastContext";
import { parseTopologyState } from "@/lib/topology-parse";
import {
  buildDesignBomCsv,
  cameraLensVertex,
  downloadTextFile,
  polylineLengthPx,
  snapCoord,
  sumCableLengthM,
  svgArcOpen,
} from "@/lib/schema-design-tools";
import type {
  CameraPlanOverlay,
  ClientTopologyState,
  FloorPlanPathEntry,
  TopologyCanvasNode,
  TopologyDeviceKind,
} from "@/lib/types";
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

/**
 * Polje vidnosti: vrh stožca na „objektivu“ (rahlo pred središčem ikone v smeri pogleda),
 * ne v geometrijskem središču ikone.
 */
function cameraFovPath(
  iconCx: number,
  iconCy: number,
  rotationDeg: number,
  fovDeg: number,
  reach: number,
  lensForwardPx = 18,
) {
  const { vx, vy, br } = cameraLensVertex(iconCx, iconCy, rotationDeg, lensForwardPx);
  const fov = Number.isFinite(fovDeg) && fovDeg > 0 ? Math.min(fovDeg, 359) : 70;
  const half = (fov * Math.PI) / 360;
  const a1 = br - half;
  const a2 = br + half;
  const r = Number.isFinite(reach) && reach > 20 ? reach : 150;
  const x1 = vx + r * Math.cos(a1);
  const y1 = vy + r * Math.sin(a1);
  const x2 = vx + r * Math.cos(a2);
  const y2 = vy + r * Math.sin(a2);
  const largeArc = fov > 180 ? 1 : 0;
  return `M ${vx} ${vy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
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
  const [drawStrokeKind, setDrawStrokeKind] = useState<"wall" | "cable">("wall");
  const [cableTypeDraft, setCableTypeDraft] = useState("Cat6");
  const canvasRef = useRef<HTMLDivElement>(null);

  const cableTotalM = useMemo(
    () => sumCableLengthM(topo.floorPlanPaths, topo.planCalibration?.metersPerPx),
    [topo.floorPlanPaths, topo.planCalibration?.metersPerPx],
  );

  const selectedPathLenM = useMemo(() => {
    if (selectedPathIdx === null || !topo.floorPlanPaths?.[selectedPathIdx] || !topo.planCalibration?.metersPerPx)
      return null;
    const px = polylineLengthPx(topo.floorPlanPaths[selectedPathIdx].points);
    return Math.round(px * topo.planCalibration.metersPerPx * 100) / 100;
  }, [selectedPathIdx, topo.floorPlanPaths, topo.planCalibration?.metersPerPx]);

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
    const g = topo.snapGridPx;
    const x = Math.max(20, snapCoord(Math.round(e.clientX - rect.left - 48), g));
    const y = Math.max(20, snapCoord(Math.round(e.clientY - rect.top - 20), g));
    const node: TopologyCanvasNode = {
      id: newId(),
      label: payload.label,
      x,
      y,
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

  const patchCameraPlan = (patch: Partial<CameraPlanOverlay>) => {
    if (!selectedNodeId) return;
    setTopo((t) => ({
      ...t,
      nodes: t.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, cameraPlan: { ...n.cameraPlan, ...patch } } : n,
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
    const g = topo.snapGridPx;
    const p0 = { x: snapCoord(lineStart.x, g), y: snapCoord(lineStart.y, g) };
    const p1 = { x: snapCoord(snapped.x, g), y: snapCoord(snapped.y, g) };
    if (Math.hypot(p1.x - p0.x, p1.y - p0.y) > 2) {
      const entry: FloorPlanPathEntry = {
        points: [p0, p1],
        kind: drawStrokeKind === "cable" ? "cable" : "wall",
      };
      if (drawStrokeKind === "cable" && cableTypeDraft.trim()) entry.cableType = cableTypeDraft.trim();
      setTopo((t) => ({
        ...t,
        floorPlanPaths: [...(t.floorPlanPaths ?? []), entry],
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
    const g = topo.snapGridPx;
    const move = (e: PointerEvent) => {
      const el = canvasRef.current;
      if (!el) return;
      const parent = el.getBoundingClientRect();
      const x = snapCoord(Math.round(e.clientX - parent.left - dragging.dx), g);
      const y = snapCoord(Math.round(e.clientY - parent.top - dragging.dy), g);
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
  }, [dragging, topo.snapGridPx]);

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
          <button
            type="button"
            className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)] hover:text-[var(--vo-fg)]"
            onClick={() =>
              downloadTextFile(
                `visionone-bom-${client.slug ?? client.id}.csv`,
                buildDesignBomCsv(client, topo.nodes),
              )
            }
          >
            Izvoži BOM (CSV)
          </button>
        </div>

        {editMode ? (
          <div className="space-y-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-xs">
            <p className="font-semibold text-[var(--vo-fg)]">Načrtovalska orodja (podobno CCTV Design Tool)</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[var(--vo-muted)]">
                Merilo (m / px)
                <input
                  type="number"
                  step="any"
                  placeholder="npr. 0.02"
                  value={topo.planCalibration?.metersPerPx ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const n = Number(v);
                    setTopo((t) => ({
                      ...t,
                      planCalibration:
                        v.trim() === "" || !Number.isFinite(n) || n <= 0 ? undefined : { metersPerPx: n },
                    }));
                  }}
                  className="mt-0.5 w-28 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                />
              </label>
              <label className="flex flex-col text-[var(--vo-muted)]">
                Snap mreža (px)
                <select
                  value={topo.snapGridPx ?? 0}
                  onChange={(e) =>
                    setTopo((t) => ({
                      ...t,
                      snapGridPx: Number(e.target.value) || undefined,
                    }))
                  }
                  className="mt-0.5 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                >
                  <option value={0}>Brez</option>
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                  <option value={32}>32</option>
                </select>
              </label>
              <div className="flex flex-col text-[var(--vo-muted)]">
                Risba črte
                <div className="mt-0.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDrawStrokeKind("wall")}
                    className={`rounded border px-2 py-1 ${drawStrokeKind === "wall" ? "border-[var(--vo-accent)] bg-[var(--vo-accent-muted)]" : "border-[var(--vo-border)]"}`}
                  >
                    Stena / tloris
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawStrokeKind("cable")}
                    className={`rounded border px-2 py-1 ${drawStrokeKind === "cable" ? "border-amber-500/70 bg-amber-500/15" : "border-[var(--vo-border)]"}`}
                  >
                    Kabel
                  </button>
                </div>
              </div>
              {drawStrokeKind === "cable" ? (
                <label className="flex flex-col text-[var(--vo-muted)]">
                  Tip kabla
                  <input
                    value={cableTypeDraft}
                    onChange={(e) => setCableTypeDraft(e.target.value)}
                    placeholder="Cat6"
                    className="mt-0.5 w-28 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                  />
                </label>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--vo-border)] pt-2 text-[var(--vo-muted)]">
              {topo.planCalibration?.metersPerPx ? (
                <span>
                  Skupaj kabli (ocena):{" "}
                  <strong className="text-amber-200">{cableTotalM.toFixed(2)} m</strong>
                </span>
              ) : (
                <span>Vnesite merilo za izračun dolžin kablov.</span>
              )}
              {selectedPathLenM != null ? (
                <span className="text-[var(--vo-fg)]">
                  Izbrana črta: <strong>{selectedPathLenM} m</strong>
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {editMode ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-xs">
            <span className="font-medium text-[var(--vo-muted)]">Ozadje (URL slike / ortofoto):</span>
            <input
              type="url"
              placeholder="https://…"
              value={topo.planBackgroundUrl ?? ""}
              onChange={(e) =>
                setTopo((t) => ({
                  ...t,
                  planBackgroundUrl: e.target.value.trim() || undefined,
                  planBackgroundDataUrl: e.target.value.trim() ? undefined : t.planBackgroundDataUrl,
                }))
              }
              className="min-w-[200px] flex-1 rounded border border-[var(--vo-border)] bg-transparent px-2 py-1 text-[var(--vo-fg)]"
            />
            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-[var(--vo-border)] px-2 py-1 hover:bg-[var(--vo-surface-2)]">
              Naloži sliko
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 2_400_000) {
                    showToast("Slika je prevelika za shranjevanje v načrt (max ~2,4 MB). Uporabi URL ali zmanjšaj.", "err");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const url = typeof reader.result === "string" ? reader.result : "";
                    if (!url.startsWith("data:")) return;
                    setTopo((t) => ({
                      ...t,
                      planBackgroundDataUrl: url,
                      planBackgroundUrl: undefined,
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <button
              type="button"
              className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)] hover:text-[var(--vo-danger)]"
              onClick={() =>
                setTopo((t) => ({ ...t, planBackgroundUrl: undefined, planBackgroundDataUrl: undefined }))
              }
            >
              Odstrani ozadje
            </button>
          </div>
        ) : null}

        {editMode && selectedNodeId ? (
          (() => {
            const sel = topo.nodes.find((n) => n.id === selectedNodeId);
            const cp = sel?.cameraPlan;
            if (!sel || sel.deviceRef?.kind !== "camera") return null;
            return (
              <div className="rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface-2)] px-3 py-2 text-xs">
                <p className="mb-2 font-semibold text-[var(--vo-fg)]">Kamera na načrtu (pokritost)</p>
                <div className="flex flex-wrap gap-2">
                  <label className="flex flex-col text-[var(--vo-muted)]">
                    Št. oznake
                    <input
                      type="number"
                      value={cp?.badge ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchCameraPlan(v === "" ? { badge: undefined } : { badge: Number(v) || 0 });
                      }}
                      className="mt-0.5 w-20 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                    />
                  </label>
                  <label className="flex flex-col text-[var(--vo-muted)]">
                    Višina (m)
                    <input
                      type="number"
                      step="0.1"
                      value={cp?.mountHeightM ?? ""}
                      placeholder="3"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchCameraPlan(v === "" ? { mountHeightM: undefined } : { mountHeightM: Number(v) });
                      }}
                      className="mt-0.5 w-24 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                    />
                  </label>
                  <label className="flex flex-col text-[var(--vo-muted)]">
                    Naklon (°)
                    <input
                      type="number"
                      value={cp?.tiltDeg ?? ""}
                      placeholder="15"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchCameraPlan(v === "" ? { tiltDeg: undefined } : { tiltDeg: Number(v) });
                      }}
                      className="mt-0.5 w-20 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                    />
                  </label>
                  <label className="flex flex-col text-[var(--vo-muted)]">
                    FOV (°)
                    <input
                      type="number"
                      value={cp?.fovDeg ?? ""}
                      placeholder="70"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchCameraPlan(v === "" ? { fovDeg: undefined } : { fovDeg: Number(v) });
                      }}
                      className="mt-0.5 w-20 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                    />
                  </label>
                  <label className="flex flex-col text-[var(--vo-muted)]">
                    Doseg (px)
                    <input
                      type="number"
                      value={cp?.reachPx ?? ""}
                      placeholder="150"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchCameraPlan(v === "" ? { reachPx: undefined } : { reachPx: Number(v) });
                      }}
                      className="mt-0.5 w-24 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                    />
                  </label>
                  <label className="flex cursor-pointer items-end gap-2 pb-1 text-[var(--vo-muted)]">
                    <input
                      type="checkbox"
                      checked={Boolean(cp?.showDoriZones)}
                      onChange={(e) =>
                        patchCameraPlan({ showDoriZones: e.target.checked ? true : undefined })
                      }
                      className="rounded border-[var(--vo-border)]"
                    />
                    DORI obroči (poenostavljeno)
                  </label>
                  <label className="flex flex-col text-[var(--vo-muted)]">
                    IR doseg (px)
                    <input
                      type="number"
                      value={cp?.irReachPx ?? ""}
                      placeholder="opcijsko"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchCameraPlan(v === "" ? { irReachPx: undefined } : { irReachPx: Number(v) });
                      }}
                      className="mt-0.5 w-24 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                    />
                  </label>
                </div>
                <p className="mt-2 text-[var(--vo-muted)]">
                  Obrnite ikono (‑15° / +15°) za smer „streha“ polja vidnosti. DORI je orientacijski model (ne EN 62676 certifikacija).
                </p>
              </div>
            );
          })()
        ) : null}

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
          {(topo.planBackgroundDataUrl ?? topo.planBackgroundUrl) ? (
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.92]"
              style={{
                backgroundImage: `url(${topo.planBackgroundDataUrl ?? topo.planBackgroundUrl})`,
              }}
              aria-hidden
            />
          ) : null}
          {editMode && (topo.snapGridPx ?? 0) > 0 ? (
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.42]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.5) 1px, transparent 1px)",
                backgroundSize: `${topo.snapGridPx}px ${topo.snapGridPx}px`,
              }}
              aria-hidden
            />
          ) : null}
          <svg className="absolute inset-0 h-full w-full">
            {topo.nodes.map((n) => {
              if (n.deviceRef?.kind !== "camera") return null;
              const cx = n.x + 32;
              const cy = n.y + 20;
              const plan = n.cameraPlan;
              const fovDeg = plan?.fovDeg ?? 70;
              const reach = plan?.reachPx ?? 150;
              const d = cameraFovPath(cx, cy, n.rotationDeg ?? 0, fovDeg, reach);
              const st = getDeviceStatus("camera", n.deviceRef.id);
              const fill =
                st === "online" ? "rgba(59, 130, 246, 0.28)" : "rgba(248, 113, 113, 0.22)";
              const stroke = st === "online" ? "rgba(59, 130, 246, 0.65)" : "rgba(248, 113, 113, 0.55)";
              const { vx, vy, br } = cameraLensVertex(cx, cy, n.rotationDeg ?? 0);
              const fov = Number.isFinite(fovDeg) && fovDeg > 0 ? Math.min(fovDeg, 359) : 70;
              const half = (fov * Math.PI) / 360;
              const a1 = br - half;
              const a2 = br + half;
              const ir = plan?.irReachPx;
              return (
                <g key={`cam-${n.id}`}>
                  <path d={d} fill={fill} stroke={stroke} strokeWidth={1.5} />
                  {plan?.showDoriZones ? (
                    <>
                      {[0.33, 0.55, 0.77].map((fr, idx) => (
                        <path
                          key={`dori-a-${idx}`}
                          d={svgArcOpen(vx, vy, reach * fr, a1, a2)}
                          fill="none"
                          stroke="rgba(255,255,255,0.55)"
                          strokeWidth={1.2}
                          strokeDasharray="5 4"
                        />
                      ))}
                      {[
                        { fr: 0.28, t: "D" },
                        { fr: 0.48, t: "O" },
                        { fr: 0.68, t: "R" },
                        { fr: 0.88, t: "I" },
                      ].map(({ fr, t }) => (
                        <text
                          key={`dori-${t}-${n.id}`}
                          x={vx + reach * fr * Math.cos(br)}
                          y={vy + reach * fr * Math.sin(br)}
                          fill="rgba(255,255,255,0.92)"
                          fontSize={10}
                          fontWeight={700}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ pointerEvents: "none" }}
                        >
                          {t}
                        </text>
                      ))}
                    </>
                  ) : null}
                  {ir != null && Number.isFinite(ir) && ir > 25 ? (
                    <path
                      d={cameraFovPath(cx, cy, n.rotationDeg ?? 0, fovDeg, ir)}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1.25}
                      strokeDasharray="8 5"
                      opacity={0.9}
                    />
                  ) : null}
                </g>
              );
            })}
            {(topo.floorPlanPaths ?? []).map((path, i) => {
              const isCable = path.kind === "cable";
              const sel = selectedPathIdx === i;
              const strokeCol = sel
                ? "rgba(56, 189, 248, 0.98)"
                : isCable
                  ? "rgba(251, 191, 36, 0.92)"
                  : "rgba(148, 163, 184, 0.85)";
              return (
              <polyline
                key={`fp-${i}`}
                points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={strokeCol}
                strokeWidth={sel ? 3 : isCable ? 2.6 : 2}
                strokeDasharray={isCable ? "7 5" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={editMode ? "cursor-pointer" : undefined}
                onClick={(e) => {
                  if (!editMode) return;
                  e.stopPropagation();
                  setSelectedPathIdx(i);
                }}
              />
              );
            })}
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
                  <div className="relative flex flex-col items-center">
                    {isCamera && n.cameraPlan?.badge != null && Number.isFinite(n.cameraPlan.badge) ? (
                      <span className="absolute -right-1 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-md">
                        {n.cameraPlan.badge}
                      </span>
                    ) : null}
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
                    {isCamera && (n.cameraPlan?.mountHeightM != null || n.cameraPlan?.tiltDeg != null) ? (
                      <div className="mt-0.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white shadow">
                        {n.cameraPlan.mountHeightM != null ? `${n.cameraPlan.mountHeightM}m` : "?m"}
                        {" · "}
                        {n.cameraPlan.tiltDeg != null ? `${n.cameraPlan.tiltDeg}°` : "?°"}
                      </div>
                    ) : null}
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
