import type { TopologyEdge, TopologyNode } from "@/lib/types";

type Props = { nodes: TopologyNode[]; edges: TopologyEdge[] };

const colors: Record<TopologyNode["type"], string> = {
  internet: "#64748b",
  router: "#0d9488",
  switch: "#2563eb",
  nvr: "#a855f7",
  camera: "#eab308",
};

export function NetworkTopology({ nodes, edges }: Props) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="rounded-2xl border border-[var(--vo-border)] bg-[var(--vo-surface)] p-4 shadow-[var(--vo-card-shadow)]">
      <h3 className="text-sm font-semibold text-[var(--vo-fg)]">Omrežna topologija (demo)</h3>
      <p className="mt-1 text-xs text-[var(--vo-muted)]">
        Vozlišča in povezave — kasneje SVG/Canvas iz API topologije.
      </p>
      <svg
        viewBox="0 0 760 240"
        className="mt-4 h-auto w-full max-w-full text-[var(--vo-fg)]"
      >
        {edges.map((e) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}-${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--vo-border)"
              strokeWidth={2}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle r={n.type === "internet" ? 22 : 18} fill={colors[n.type]} opacity={0.9} />
            <text
              textAnchor="middle"
              y={30}
              fill="currentColor"
              style={{ fontSize: 11 }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
