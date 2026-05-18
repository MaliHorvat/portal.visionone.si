import { defaultIconForDeviceKind, parseSchemaIconKey } from "@/lib/schema-icons";
import type {
  CameraPlanOverlay,
  ClientTopologyState,
  FloorPlanPathEntry,
  FloorPlanStrokeKind,
  TopologyCanvasEdge,
  TopologyCanvasNode,
  TopologyDeviceKind,
} from "@/lib/types";

const KINDS: TopologyDeviceKind[] = ["camera", "recorder", "switch", "disk"];

function parseDeviceRef(
  raw: unknown,
): { kind: TopologyDeviceKind; id: string } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const k = (raw as { kind?: string }).kind;
  const id = (raw as { id?: string }).id;
  if (typeof id !== "string" || !KINDS.includes(k as TopologyDeviceKind)) return undefined;
  return { kind: k as TopologyDeviceKind, id };
}

function parseCameraPlan(raw: unknown): CameraPlanOverlay | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const badge = typeof p.badge === "number" && Number.isFinite(p.badge) ? Math.round(p.badge) : undefined;
  const mountHeightM =
    typeof p.mountHeightM === "number" && Number.isFinite(p.mountHeightM) ? p.mountHeightM : undefined;
  const tiltDeg = typeof p.tiltDeg === "number" && Number.isFinite(p.tiltDeg) ? p.tiltDeg : undefined;
  const fovDeg = typeof p.fovDeg === "number" && Number.isFinite(p.fovDeg) ? p.fovDeg : undefined;
  const reachPx = typeof p.reachPx === "number" && Number.isFinite(p.reachPx) ? p.reachPx : undefined;
  const showDoriZones = typeof p.showDoriZones === "boolean" ? p.showDoriZones : undefined;
  const irReachPx = typeof p.irReachPx === "number" && Number.isFinite(p.irReachPx) ? p.irReachPx : undefined;
  if (
    badge === undefined &&
    mountHeightM === undefined &&
    tiltDeg === undefined &&
    fovDeg === undefined &&
    reachPx === undefined &&
    showDoriZones === undefined &&
    irReachPx === undefined
  )
    return undefined;
  return { badge, mountHeightM, tiltDeg, fovDeg, reachPx, showDoriZones, irReachPx };
}

function parseAppearance(raw: unknown): TopologyCanvasNode["appearance"] {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const displayName = typeof p.displayName === "string" ? p.displayName : undefined;
  const iconColor = typeof p.iconColor === "string" ? p.iconColor : undefined;
  const iconSizePx =
    typeof p.iconSizePx === "number" && Number.isFinite(p.iconSizePx) ? p.iconSizePx : undefined;
  const showFov = typeof p.showFov === "boolean" ? p.showFov : undefined;
  const fovColor = typeof p.fovColor === "string" ? p.fovColor : undefined;
  if (!displayName && !iconColor && iconSizePx === undefined && showFov === undefined && !fovColor)
    return undefined;
  return { displayName, iconColor, iconSizePx, showFov, fovColor };
}

function parsePlanMeta(raw: unknown): TopologyCanvasNode["planMeta"] {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? p[k] : undefined);
  const ports = typeof p.ports === "number" && Number.isFinite(p.ports) ? p.ports : undefined;
  const meta = {
    ip: str("ip"),
    model: str("model"),
    manufacturer: str("manufacturer"),
    comment: str("comment"),
    floor: str("floor"),
    mac: str("mac"),
    ports,
    rtspUser: str("rtspUser"),
    rtspPass: str("rtspPass"),
    photoBefore: str("photoBefore")?.startsWith("data:") ? str("photoBefore") : undefined,
    photoAfter: str("photoAfter")?.startsWith("data:") ? str("photoAfter") : undefined,
    photoNvr: str("photoNvr")?.startsWith("data:") ? str("photoNvr") : undefined,
  };
  return Object.values(meta).some((v) => v !== undefined && v !== "") ? meta : undefined;
}

function parseLayerVisibility(raw: unknown): ClientTopologyState["layerVisibility"] {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const b = (k: string) => (typeof p[k] === "boolean" ? p[k] : undefined);
  const lv = {
    background: b("background"),
    walls: b("walls"),
    cables: b("cables"),
    fov: b("fov"),
    devices: b("devices"),
    edges: b("edges"),
  };
  return Object.values(lv).some((v) => v !== undefined) ? lv : undefined;
}

export function parseTopologyState(raw: unknown): ClientTopologyState {
  if (!raw || typeof raw !== "object") return { nodes: [], edges: [], floorPlanPaths: [] };
  const o = raw as Record<string, unknown>;
  const planBackgroundUrl =
    typeof o.planBackgroundUrl === "string" && o.planBackgroundUrl.trim() ? o.planBackgroundUrl.trim() : undefined;
  const planBackgroundDataUrl =
    typeof o.planBackgroundDataUrl === "string" && o.planBackgroundDataUrl.startsWith("data:")
      ? o.planBackgroundDataUrl
      : undefined;
  const snapGridPx =
    typeof o.snapGridPx === "number" && Number.isFinite(o.snapGridPx) && o.snapGridPx >= 0 ? o.snapGridPx : undefined;
  let planCalibration: ClientTopologyState["planCalibration"] = undefined;
  if (o.planCalibration && typeof o.planCalibration === "object") {
    const c = o.planCalibration as { metersPerPx?: unknown };
    const metersPerPx =
      typeof c.metersPerPx === "number" && Number.isFinite(c.metersPerPx) && c.metersPerPx > 0 ? c.metersPerPx : undefined;
    planCalibration = metersPerPx !== undefined ? { metersPerPx } : undefined;
  }
  const nodesRaw = Array.isArray(o.nodes) ? o.nodes : [];
  const edgesRaw = Array.isArray(o.edges) ? o.edges : [];
  const pathsRaw = Array.isArray(o.floorPlanPaths) ? o.floorPlanPaths : [];
  const nodes: TopologyCanvasNode[] = nodesRaw
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n, i) => {
      const deviceRef = parseDeviceRef(n.deviceRef);
      const iconKey =
        parseSchemaIconKey(n.iconKey) ??
        (deviceRef ? defaultIconForDeviceKind(deviceRef.kind) : "generic");
      return {
        id: typeof n.id === "string" ? n.id : `n-${i}`,
        label: typeof n.label === "string" ? n.label : "Naprava",
        x: typeof n.x === "number" ? n.x : 80 + (i % 5) * 120,
        y: typeof n.y === "number" ? n.y : 80 + Math.floor(i / 5) * 100,
        rotationDeg: typeof n.rotationDeg === "number" ? n.rotationDeg : 0,
        deviceRef,
        cameraPlan: parseCameraPlan(n.cameraPlan),
        iconKey,
        appearance: parseAppearance(n.appearance),
        planMeta: parsePlanMeta(n.planMeta),
      };
    });
  const edges: TopologyCanvasEdge[] = edgesRaw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      from: typeof e.from === "string" ? e.from : "",
      to: typeof e.to === "string" ? e.to : "",
      label: typeof e.label === "string" ? e.label : undefined,
      cableType: typeof e.cableType === "string" ? e.cableType : undefined,
    }))
    .filter((e) => e.from && e.to);

  const floorPlanPaths: FloorPlanPathEntry[] = pathsRaw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => {
      const pointsRaw = Array.isArray(p.points) ? p.points : [];
      const points = pointsRaw
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          x: typeof x.x === "number" ? x.x : 0,
          y: typeof x.y === "number" ? x.y : 0,
        }));
      const kind: FloorPlanStrokeKind | undefined =
        p.kind === "cable" ? "cable" : p.kind === "wall" ? "wall" : undefined;
      const cableType = typeof p.cableType === "string" ? p.cableType : undefined;
      return { points, kind, cableType };
    })
    .filter((p) => p.points.length > 1);
  const planNotes = typeof o.planNotes === "string" ? o.planNotes : undefined;
  const mapBackgroundUrl =
    typeof o.mapBackgroundUrl === "string" && o.mapBackgroundUrl.trim() ? o.mapBackgroundUrl.trim() : undefined;
  return {
    nodes,
    edges,
    floorPlanPaths,
    planBackgroundUrl,
    planBackgroundDataUrl,
    planCalibration,
    snapGridPx,
    planNotes,
    layerVisibility: parseLayerVisibility(o.layerVisibility),
    mapBackgroundUrl,
  };
}
