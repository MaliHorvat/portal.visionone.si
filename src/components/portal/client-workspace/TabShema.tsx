"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { usePortalRole } from "@/context/PortalRoleContext";
import { usePortalToast } from "@/context/PortalToastContext";
import { SchemaLayersPanel } from "@/components/portal/schema/SchemaLayersPanel";
import { SchemaMapView } from "@/components/portal/schema/SchemaMapView";
import { SchemaModelPanel, applyModelToNode } from "@/components/portal/schema/SchemaModelPanel";
import { SchemaToolbar } from "@/components/portal/schema/SchemaToolbar";
import { exportSchemaCanvasPng } from "@/lib/schema-canvas-export";
import { DecimalInput } from "@/components/portal/DecimalInput";
import { SchemaDeviceInspector } from "@/components/portal/schema/SchemaDeviceInspector";
import {
  SchemaIconPalette,
  type InventoryDragItem,
  type SymbolDragItem,
} from "@/components/portal/schema/SchemaIconPalette";
import { SchemaIcon } from "@/components/portal/schema/SchemaIcon";
import { catalogEntry } from "@/lib/schema-icon-catalog";
import { defaultIconForDeviceKind, isCameraIcon } from "@/lib/schema-icons";
import {
  nodeShowsFov,
  resolveDisplayName,
  resolveIconColor,
  resolveIconKey,
  resolveIconSize,
  resolveIp,
} from "@/lib/schema-node-utils";
import { parseTopologyState } from "@/lib/topology-parse";
import {
  alignNodes,
  autoNumberCameraBadges,
  buildCableScheduleCsv,
  duplicateNodeInTopo,
  exportShemaPdf,
  exportTopologyJson,
  importTopologyFromJson,
  cloneTopology,
  mergeLayerVisibility,
  openShemaPrintReport,
  topologySnapshot,
} from "@/lib/schema-design-extras";
import {
  buildDesignBomCsv,
  cameraLensVertex,
  downloadTextFile,
  polylineLengthPx,
  snapCoord,
  sumCableLengthM,
  svgArcOpen,
} from "@/lib/schema-design-tools";
import { useSchemaHistory } from "@/lib/use-schema-history";
import type {
  CameraPlanOverlay,
  ClientTopologyState,
  FloorPlanPathEntry,
  TopologyCanvasNode,
  TopologyDeviceKind,
} from "@/lib/types";
import type { WorkspaceCtx } from "./types";

const CAMERA_DOT_LENS_FORWARD_PX = 0;

function nodeAnchor(n: TopologyCanvasNode, globalIconSize: number) {
  const sz = resolveIconSize(n, globalIconSize);
  return { cx: n.x + sz / 2, cy: n.y + sz / 2, sz };
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

export function TabShema({ ctx }: { ctx: WorkspaceCtx }) {
  const { showToast } = usePortalToast();
  const { role } = usePortalRole();
  const canEdit = role === "admin" || role === "operator";
  const { client, clientId, dbConfigured, reload, applyClient } = ctx;
  const {
    topo,
    mutateTopo,
    mutateTopoSilent,
    replaceTopo,
    pushHistoryBaseline,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSchemaHistory(parseTopologyState(client.topologyData));
  const [savedSnap, setSavedSnap] = useState(() =>
    topologySnapshot(parseTopologyState(client.topologyData)),
  );
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
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [globalIconSize, setGlobalIconSize] = useState(40);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<Array<{ x: number; y: number }>>([]);
  const [clipboard, setClipboard] = useState<TopologyCanvasNode | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"floor" | "map">("floor");
  const [exportingPng, setExportingPng] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const exportRootRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const dragBaselineRef = useRef<ClientTopologyState | null>(null);
  const layers = useMemo(() => mergeLayerVisibility(topo.layerVisibility), [topo.layerVisibility]);
  const isDirty = topologySnapshot(topo) !== savedSnap;

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
    const p = parseTopologyState(client.topologyData);
    replaceTopo(p, true);
    setSavedSnap(topologySnapshot(p));
  }, [client.topologyData, replaceTopo]);

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

  const inventoryGroups: { title: string; items: InventoryDragItem[] }[] = useMemo(
    () => [
      {
        title: "Kamere",
        items: client.cameras.map((c) => ({
          type: "inventory" as const,
          kind: "camera" as const,
          id: c.id,
          label: `${c.tag ? `${c.tag} ` : ""}${c.name}`.trim(),
        })),
      },
      {
        title: "Snemalniki",
        items: client.nvrs.map((r) => ({
          type: "inventory" as const,
          kind: "recorder" as const,
          id: r.id,
          label: r.name,
        })),
      },
      {
        title: "Switchi",
        items: client.switches.map((s) => ({
          type: "inventory" as const,
          kind: "switch" as const,
          id: s.id,
          label: s.name,
        })),
      },
      {
        title: "Diski",
        items: client.disks.map((d) => ({
          type: "inventory" as const,
          kind: "disk" as const,
          id: d.id,
          label: d.label,
        })),
      },
    ],
    [client],
  );

  const selectedNode = useMemo(
    () => (selectedNodeId ? topo.nodes.find((n) => n.id === selectedNodeId) : undefined),
    [selectedNodeId, topo.nodes],
  );

  const patchNode = useCallback(
    (id: string, patch: Partial<TopologyCanvasNode>) => {
      mutateTopo((t) => ({
        ...t,
        nodes: t.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }));
    },
    [mutateTopo],
  );

  const onCanvasDrop = (e: React.DragEvent) => {
    if (!editMode || !canvasRef.current) return;
    e.preventDefault();
    const raw =
      e.dataTransfer.getData("application/vnd.visionone.schema") ||
      e.dataTransfer.getData("application/json");
    if (!raw) return;
    let parsed: SymbolDragItem | InventoryDragItem | { kind: TopologyDeviceKind; id: string; label: string };
    try {
      parsed = JSON.parse(raw) as SymbolDragItem | InventoryDragItem | { kind: TopologyDeviceKind; id: string; label: string };
    } catch {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const g = topo.snapGridPx;
    const dropX = (e.clientX - rect.left) / canvasZoom;
    const dropY = (e.clientY - rect.top) / canvasZoom;
    const half = globalIconSize / 2;
    const x = Math.max(8, snapCoord(Math.round(dropX - half), g));
    const y = Math.max(8, snapCoord(Math.round(dropY - half), g));

    if ("type" in parsed && parsed.type === "symbol") {
      const sym = parsed as SymbolDragItem;
      const entry = catalogEntry(sym.iconKey);
      const node: TopologyCanvasNode = {
        id: newId(),
        label: sym.label,
        x,
        y,
        iconKey: sym.iconKey,
        appearance: { iconColor: entry.defaultColor, showFov: isCameraIcon(sym.iconKey) },
        cameraPlan: isCameraIcon(sym.iconKey) ? { fovDeg: 70, reachPx: 150 } : undefined,
      };
      mutateTopo((t) => ({ ...t, nodes: [...t.nodes, node] }));
      setSelectedNodeId(node.id);
      return;
    }

    const inv =
      "type" in parsed && parsed.type === "inventory"
        ? parsed
        : { type: "inventory" as const, kind: parsed.kind, id: parsed.id, label: parsed.label };
    const iconKey = defaultIconForDeviceKind(inv.kind);
    const node: TopologyCanvasNode = {
      id: newId(),
      label: inv.label,
      x,
      y,
      deviceRef: { kind: inv.kind, id: inv.id },
      iconKey,
      appearance: { iconColor: catalogEntry(iconKey).defaultColor, showFov: inv.kind === "camera" },
      cameraPlan: inv.kind === "camera" ? { fovDeg: 70, reachPx: 150 } : undefined,
    };
    mutateTopo((t) => ({ ...t, nodes: [...t.nodes, node] }));
    setSelectedNodeId(node.id);
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
      mutateTopo((t) => ({ ...t, edges: [...t.edges, { from: connectFrom, to: id }] }));
    }
    setConnectFrom(null);
  };

  const removeNode = (id: string) => {
    mutateTopo((t) => ({
      ...t,
      nodes: t.nodes.filter((n) => n.id !== id),
      edges: t.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const clearAll = () => {
    if (!editMode) return;
    if (!confirm("Res želite počistiti celotno shemo (vozlišča + povezave + risbo)?")) return;
    mutateTopo((t) => ({ ...t, nodes: [], edges: [], floorPlanPaths: [] }));
  };
  const removeEdge = (idx: number) =>
    mutateTopo((t) => ({ ...t, edges: t.edges.filter((_, i) => i !== idx) }));

  const rotateNode = (id: string, delta: number) => {
    mutateTopo((t) => ({
      ...t,
      nodes: t.nodes.map((n) =>
        n.id === id ? { ...n, rotationDeg: (((n.rotationDeg ?? 0) + delta) % 360 + 360) % 360 } : n,
      ),
    }));
  };

  const patchCameraPlan = (patch: Partial<CameraPlanOverlay>) => {
    if (!selectedNodeId) return;
    mutateTopo((t) => ({
      ...t,
      nodes: t.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, cameraPlan: { ...n.cameraPlan, ...patch } } : n,
      ),
    }));
  };

  const getNodeStatus = (n: TopologyCanvasNode): "online" | "offline" | "unknown" => {
    if (!n.deviceRef) return "unknown";
    return getDeviceStatus(n.deviceRef.kind, n.deviceRef.id);
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
    if (measureMode) {
      const pt = canvasPoint(e);
      if (!pt) return;
      setMeasurePts((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
      return;
    }
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
      mutateTopo((t) => ({
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
    mutateTopo((t) => ({ ...t, floorPlanPaths: [] }));
    setSelectedPathIdx(null);
  };

  const removeSelectedPath = () => {
    if (!editMode || selectedPathIdx === null) return;
    mutateTopo((t) => ({
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
    setSavedSnap(topologySnapshot(topo));
    showToast("Načrt shranjen.");
  }, [applyClient, clientId, dbConfigured, reload, showToast, topo]);

  useEffect(() => {
    if (!dragging || !canvasRef.current) return;
    const g = topo.snapGridPx;
    const move = (e: PointerEvent) => {
      const el = canvasRef.current;
      if (!el) return;
      const parent = el.getBoundingClientRect();
      const x = snapCoord(Math.round(e.clientX - parent.left - dragging.dx), g);
      const y = snapCoord(Math.round(e.clientY - parent.top - dragging.dy), g);
      mutateTopoSilent((t) => ({
        ...t,
        nodes: t.nodes.map((n) =>
          n.id === dragging.id ? { ...n, x: Math.max(8, x), y: Math.max(8, y) } : n,
        ),
      }));
    };
    const up = () => {
      if (dragBaselineRef.current) {
        pushHistoryBaseline(dragBaselineRef.current);
        dragBaselineRef.current = null;
      }
      setDragging(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, topo.snapGridPx, mutateTopoSilent, pushHistoryBaseline, topo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
        return;
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        redo();
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (dbConfigured) void save();
      }
      if (e.key === "Delete" && selectedNodeId && editMode) {
        removeNode(selectedNodeId);
      }
      if (e.ctrlKey && e.key === "c" && selectedNodeId) {
        const n = topo.nodes.find((x) => x.id === selectedNodeId);
        if (n) setClipboard(JSON.parse(JSON.stringify(n)));
      }
      if (e.ctrlKey && e.key === "v" && clipboard && editMode) {
        const id = newId();
        mutateTopo((t) => ({
          ...t,
          nodes: [
            ...t.nodes,
            { ...clipboard, id, x: clipboard.x + 32, y: clipboard.y + 32, deviceRef: undefined },
          ],
        }));
        setSelectedNodeId(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clipboard, dbConfigured, editMode, redo, removeNode, save, selectedNodeId, topo.nodes, undo, mutateTopo]);

  const canvasPoint = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / canvasZoom,
      y: (e.clientY - rect.top) / canvasZoom,
    };
  };

  const measureLenM = useMemo(() => {
    if (measurePts.length < 2 || !topo.planCalibration?.metersPerPx) return null;
    const px = Math.hypot(measurePts[1].x - measurePts[0].x, measurePts[1].y - measurePts[0].y);
    return Math.round(px * topo.planCalibration.metersPerPx * 100) / 100;
  }, [measurePts, topo.planCalibration?.metersPerPx]);

  return (
    <div
      ref={shellRef}
      className={`flex min-h-[640px] flex-col gap-2 xl:flex-row ${fullscreen ? "fixed inset-0 z-50 bg-[var(--vo-bg)] p-3" : ""}`}
    >
      <aside className="flex w-full shrink-0 flex-col gap-0 lg:w-52 xl:w-56">
        <SchemaIconPalette
          inventoryGroups={inventoryGroups}
          editMode={editMode && canEdit}
          dbConfigured={dbConfigured}
          getDeviceStatus={getDeviceStatus}
        />
        <div className="rounded-xl border border-t-0 border-[var(--vo-border)] bg-[var(--vo-surface)] px-2 pb-2 lg:border-t">
          <SchemaModelPanel
            client={client}
            selectedNodeId={selectedNodeId}
            editMode={editMode && canEdit}
            onApplyModel={(entry, nodeId) => {
              mutateTopo((t) => ({
                ...t,
                nodes: t.nodes.map((n) => (n.id === nodeId ? { ...n, ...applyModelToNode(n, entry) } : n)),
              }));
              showToast(`Model ${entry.manufacturer} ${entry.model} uporabljen.`);
            }}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {connectFrom ? (
          <p className="rounded-lg bg-[var(--vo-accent-muted)] px-3 py-1.5 text-xs text-[var(--vo-accent)]">
            Izberite drugo napravo za povezavo (drugi klik prekliče). Desni klik na ikono — odstrani.
          </p>
        ) : null}
        {measureMode ? (
          <p className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200">
            Merjenje: kliknite dve točki.{measureLenM != null ? ` ≈ ${measureLenM} m` : ""}
          </p>
        ) : null}
        <SchemaToolbar
          editMode={editMode && canEdit}
          canUndo={canUndo}
          canRedo={canRedo}
          isDirty={isDirty}
          measureMode={measureMode}
          showLayers={showLayers}
          fullscreen={fullscreen}
          selectedNodeId={selectedNodeId}
          dbConfigured={dbConfigured}
          onToggleEdit={() => canEdit && setEditMode((v) => !v)}
          onUndo={undo}
          onRedo={redo}
          onSave={() => void save()}
          onExportBom={() =>
            downloadTextFile(`visionone-bom-${client.slug ?? client.id}.csv`, buildDesignBomCsv(client, topo.nodes))
          }
          onExportCables={() =>
            downloadTextFile(`kabli-${client.slug ?? client.id}.csv`, buildCableScheduleCsv(topo, client))
          }
          onExportPdf={() => void exportShemaPdf(client, topo, cableTotalM)}
          onPrint={() => openShemaPrintReport(client, topo, cableTotalM)}
          onExportJson={() => exportTopologyJson(client.slug ?? client.id, topo)}
          onImportJson={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const parsed = importTopologyFromJson(String(reader.result ?? ""));
                if (!parsed) {
                  showToast("Neveljavna JSON shema.", "err");
                  return;
                }
                mutateTopo(() => parsed);
                showToast("Shema uvožena — shranite.");
              };
              reader.readAsText(file);
            };
            input.click();
          }}
          onAutoNumber={() => mutateTopo((t) => autoNumberCameraBadges(t))}
          onDuplicate={() => selectedNodeId && mutateTopo((t) => duplicateNodeInTopo(t, selectedNodeId))}
          onCopy={() => {
            const n = selectedNodeId ? topo.nodes.find((x) => x.id === selectedNodeId) : undefined;
            if (n) setClipboard(JSON.parse(JSON.stringify(n)));
          }}
          onPaste={() => {
            if (!clipboard || !editMode) return;
            const id = newId();
            mutateTopo((t) => ({
              ...t,
              nodes: [...t.nodes, { ...clipboard, id, x: clipboard.x + 32, y: clipboard.y + 32, deviceRef: undefined }],
            }));
            setSelectedNodeId(id);
          }}
          onMeasure={() => {
            setMeasureMode((m) => !m);
            setMeasurePts([]);
          }}
          onToggleLayers={() => setShowLayers((v) => !v)}
          onFullscreen={() => {
            if (!fullscreen && shellRef.current?.requestFullscreen) {
              void shellRef.current.requestFullscreen();
              setFullscreen(true);
            } else if (document.fullscreenElement) {
              void document.exitFullscreen();
              setFullscreen(false);
            } else setFullscreen((f) => !f);
          }}
          onFitView={() => setCanvasZoom(1)}
          onAlign={(mode) => {
            const ids = selectedNodeId ? [selectedNodeId] : topo.nodes.map((n) => n.id);
            mutateTopo((t) => alignNodes(t, ids, mode));
          }}
          viewMode={viewMode}
          onViewMode={setViewMode}
          onExportPng={() => {
            const el = exportRootRef.current;
            if (!el) return;
            setExportingPng(true);
            void exportSchemaCanvasPng(el, `nacrt-${client.slug ?? client.id}.png`)
              .then(() => showToast("PNG izvožen."))
              .catch(() => showToast("Izvoz PNG ni uspel.", "err"))
              .finally(() => setExportingPng(false));
          }}
        />
        {exportingPng ? (
          <p className="text-xs text-[var(--vo-muted)]">Pripravljam PNG …</p>
        ) : null}
        {showLayers ? (
          <SchemaLayersPanel
            visibility={topo.layerVisibility}
            onChange={(v) => mutateTopo((t) => ({ ...t, layerVisibility: v }))}
            planNotes={topo.planNotes ?? ""}
            onPlanNotes={(notes) => mutateTopo((t) => ({ ...t, planNotes: notes || undefined }))}
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" disabled={!editMode} onClick={clearDrawing} className="text-[var(--vo-muted)] hover:text-[var(--vo-danger)] disabled:opacity-40">
            Počisti risbo
          </button>
          <button type="button" disabled={!editMode || selectedPathIdx === null} onClick={removeSelectedPath} className="text-[var(--vo-muted)] hover:text-[var(--vo-danger)] disabled:opacity-40">
            Izbriši črto
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={!editMode}
            className="text-xs text-[var(--vo-muted)] hover:text-[var(--vo-danger)] disabled:opacity-40"
          >
            Počisti platno
          </button>
          <div className="ml-auto flex items-center gap-1 rounded border border-[var(--vo-border)] px-1">
            <button
              type="button"
              className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
              onClick={() => setCanvasZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
              aria-label="Pomanjšaj"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3rem] text-center text-[10px] text-[var(--vo-muted)]">
              {Math.round(canvasZoom * 100)}%
            </span>
            <button
              type="button"
              className="rounded p-1 text-[var(--vo-muted)] hover:bg-[var(--vo-surface-2)]"
              onClick={() => setCanvasZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))}
              aria-label="Povečaj"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-xs text-[var(--vo-muted)]">Čvorov ({topo.nodes.length})</span>
          {selectedNodeId && editMode ? (
            <>
              <button type="button" onClick={() => rotateNode(selectedNodeId, -15)} className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                -15°
              </button>
              <button type="button" onClick={() => rotateNode(selectedNodeId, 15)} className="rounded border border-[var(--vo-border)] px-2 py-1 text-[var(--vo-muted)]">
                +15°
              </button>
            </>
          ) : null}
        </div>

        {editMode ? (
          <div className="space-y-2 rounded-lg border border-[var(--vo-border)] bg-[var(--vo-surface)] px-3 py-2 text-xs">
            <p className="font-semibold text-[var(--vo-fg)]">Načrtovalska orodja (podobno CCTV Design Tool)</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[var(--vo-muted)]">
                Merilo (m / px)
                <DecimalInput
                  placeholder="npr. 0,02"
                  value={topo.planCalibration?.metersPerPx ?? 0}
                  onChange={(n) =>
                    mutateTopo((t) => ({
                      ...t,
                      planCalibration: n > 0 ? { metersPerPx: n } : undefined,
                    }))
                  }
                  className="mt-0.5 w-28 rounded border border-[var(--vo-border)] bg-[var(--vo-bg)] px-2 py-1 text-[var(--vo-fg)]"
                />
              </label>
              <label className="flex flex-col text-[var(--vo-muted)]">
                Snap mreža (px)
                <select
                  value={topo.snapGridPx ?? 0}
                  onChange={(e) =>
                    mutateTopo((t) => ({
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
                mutateTopo((t) => ({
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
                    mutateTopo((t) => ({
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
                mutateTopo((t) => ({ ...t, planBackgroundUrl: undefined, planBackgroundDataUrl: undefined }))
              }
            >
              Odstrani ozadje
            </button>
          </div>
        ) : null}

        {viewMode === "map" ? (
          <SchemaMapView
            client={client}
            clientAddress={client.address ?? ""}
            nodes={topo.nodes}
            mapView={topo.mapView}
            editMode={editMode && canEdit}
            selectedNodeId={selectedNodeId}
            onMapViewChange={(v) => mutateTopo((t) => ({ ...t, mapView: v }))}
            onSelectNode={setSelectedNodeId}
            onNodeGeo={(nodeId, lat, lng) => {
              mutateTopo((t) => ({
                ...t,
                nodes: t.nodes.map((n) =>
                  n.id === nodeId ? { ...n, planMeta: { ...n.planMeta, geoLat: lat, geoLng: lng } } : n,
                ),
              }));
              showToast("GPS pozicija posodobljena.");
            }}
            getNodeStatus={getNodeStatus}
          />
        ) : (
        <div
          ref={canvasRef}
          className="relative min-h-[480px] flex-1 overflow-auto rounded-xl border border-[var(--vo-border)] bg-[var(--vo-bg)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onCanvasDrop}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        >
          <div
            ref={exportRootRef}
            className="relative min-h-[520px] w-full origin-top-left"
            style={{ transform: `scale(${canvasZoom})`, transformOrigin: "0 0" }}
          >
          {layers.background !== false && (topo.planBackgroundDataUrl ?? topo.planBackgroundUrl) ? (
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
            {layers.fov !== false &&
              topo.nodes.map((n) => {
              if (!nodeShowsFov(n)) return null;
              const { cx, cy } = nodeAnchor(n, globalIconSize);
              const plan = n.cameraPlan;
              const fovDeg = plan?.fovDeg ?? 70;
              const reach = plan?.reachPx ?? 150;
              const d = cameraFovPath(
                cx,
                cy,
                n.rotationDeg ?? 0,
                fovDeg,
                reach,
                CAMERA_DOT_LENS_FORWARD_PX,
              );
              const st = getNodeStatus(n);
              const fovHex = n.appearance?.fovColor ?? (st === "online" ? "#3b82f6" : "#f87171");
              const fill =
                st === "online" ? "rgba(59, 130, 246, 0.28)" : "rgba(248, 113, 113, 0.22)";
              const stroke = fovHex;
              const { vx, vy, br } = cameraLensVertex(cx, cy, n.rotationDeg ?? 0, CAMERA_DOT_LENS_FORWARD_PX);
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
                      d={cameraFovPath(
                        cx,
                        cy,
                        n.rotationDeg ?? 0,
                        fovDeg,
                        ir,
                        CAMERA_DOT_LENS_FORWARD_PX,
                      )}
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
              if (isCable && layers.cables === false) return null;
              if (!isCable && layers.walls === false) return null;
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
            {layers.edges !== false &&
              topo.edges.map((edge, i) => {
              const a = topo.nodes.find((n) => n.id === edge.from);
              const b = topo.nodes.find((n) => n.id === edge.to);
              if (!a || !b) return null;
              const aa = nodeAnchor(a, globalIconSize);
              const bb = nodeAnchor(b, globalIconSize);
              const mx = (aa.cx + bb.cx) / 2;
              const my = (aa.cy + bb.cy) / 2;
              const lbl = edge.label ?? edge.cableType;
              return (
                <g key={`${edge.from}-${edge.to}-${i}`}>
                  <line x1={aa.cx} y1={aa.cy} x2={bb.cx} y2={bb.cy} stroke="var(--vo-accent)" strokeWidth={2} opacity={0.6} />
                  {lbl ? (
                    <text x={mx} y={my} fill="var(--vo-fg)" fontSize={9} textAnchor="middle" dominantBaseline="middle">
                      {lbl}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {measurePts.length === 2 ? (
              <line
                x1={measurePts[0].x}
                y1={measurePts[0].y}
                x2={measurePts[1].x}
                y2={measurePts[1].y}
                stroke="#22d3ee"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            ) : null}
          </svg>

          {layers.devices !== false && topo.nodes.map((n) => {
            const iconKey = resolveIconKey(n);
            const sz = resolveIconSize(n, globalIconSize);
            const st = getNodeStatus(n);
            const showCamBadge =
              isCameraIcon(iconKey) && n.cameraPlan?.badge != null && Number.isFinite(n.cameraPlan.badge);
            const ip = resolveIp(n, client);
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={`absolute cursor-pointer select-none text-center ${
                  connectFrom === n.id ? "ring-2 ring-[var(--vo-accent)] ring-offset-1" : ""
                } ${selectedNodeId === n.id ? "ring-2 ring-[var(--vo-accent)] ring-offset-1" : ""}`}
                style={{ left: n.x, top: n.y, width: sz }}
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
                  dragBaselineRef.current = cloneTopology(topo);
                  setDragging({
                    id: n.id,
                    dx: (e.clientX - rect.left) / canvasZoom,
                    dy: (e.clientY - rect.top) / canvasZoom,
                  });
                }}
              >
                <div className="relative flex flex-col items-center">
                  {showCamBadge ? (
                    <span className="absolute -right-0.5 -top-1 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-0.5 text-[8px] font-bold text-white shadow-sm">
                      {n.cameraPlan!.badge}
                    </span>
                  ) : null}
                  <SchemaIcon
                    iconKey={iconKey}
                    color={resolveIconColor(n)}
                    size={sz}
                    status={st}
                    rotationDeg={n.rotationDeg ?? 0}
                  />
                  <div className="mt-1 max-w-[120px] truncate text-[10px] font-medium text-[var(--vo-fg)]">
                    {resolveDisplayName(n, client)}
                  </div>
                  {ip ? (
                    <div className="max-w-[120px] truncate font-mono text-[9px] text-[var(--vo-muted)]">{ip}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
          </div>
        </div>
        )}

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

      {selectedNode ? (
        <SchemaDeviceInspector
          client={client}
          clientId={clientId}
          dbConfigured={dbConfigured}
          node={selectedNode}
          edges={topo.edges}
          allNodes={topo.nodes}
          status={getNodeStatus(selectedNode)}
          onClose={() => setSelectedNodeId(null)}
          onPatchNode={(patch) => patchNode(selectedNode.id, patch)}
          onPatchCameraPlan={patchCameraPlan}
          onReloadClient={reload}
          globalIconSize={globalIconSize}
          onGlobalIconSize={setGlobalIconSize}
        />
      ) : null}
    </div>
  );
}
