import type {
  ClientTopologyState,
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

export function parseTopologyState(raw: unknown): ClientTopologyState {
  if (!raw || typeof raw !== "object") return { nodes: [], edges: [], floorPlanPaths: [] };
  const o = raw as Record<string, unknown>;
  const nodesRaw = Array.isArray(o.nodes) ? o.nodes : [];
  const edgesRaw = Array.isArray(o.edges) ? o.edges : [];
  const pathsRaw = Array.isArray(o.floorPlanPaths) ? o.floorPlanPaths : [];
  const nodes: TopologyCanvasNode[] = nodesRaw
    .filter((n): n is Record<string, unknown> => !!n && typeof n === "object")
    .map((n, i) => ({
      id: typeof n.id === "string" ? n.id : `n-${i}`,
      label: typeof n.label === "string" ? n.label : "Naprava",
      x: typeof n.x === "number" ? n.x : 80 + (i % 5) * 120,
      y: typeof n.y === "number" ? n.y : 80 + Math.floor(i / 5) * 100,
      rotationDeg: typeof n.rotationDeg === "number" ? n.rotationDeg : 0,
      deviceRef: parseDeviceRef(n.deviceRef),
    }));
  const edges: TopologyCanvasEdge[] = edgesRaw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      from: typeof e.from === "string" ? e.from : "",
      to: typeof e.to === "string" ? e.to : "",
    }))
    .filter((e) => e.from && e.to);

  const floorPlanPaths = pathsRaw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .map((p) => {
      const pointsRaw = Array.isArray(p.points) ? p.points : [];
      const points = pointsRaw
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          x: typeof x.x === "number" ? x.x : 0,
          y: typeof x.y === "number" ? x.y : 0,
        }));
      return { points };
    })
    .filter((p) => p.points.length > 1);
  return {
    nodes,
    edges,
    floorPlanPaths,
  };
}
