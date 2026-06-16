import { Panel } from "../Panel";
import { useDashboard } from "../../store";
import type { ServiceNode, ServiceState } from "../../types";

const STATE_COLOR: Record<ServiceState, string> = {
  ok: "var(--status-ok)",
  warn: "var(--status-warn)",
  alert: "var(--status-alert)",
  maint: "#ff9a3a",
};

// Projection isométrique simplifiée d'une grille (x, y) → (px, py).
function iso(x: number, y: number) {
  const tile = 60;
  const ox = 150;
  const oy = 30;
  return { px: ox + (x - y) * tile, py: oy + (x + y) * (tile / 2) };
}

export function ServicesPanel() {
  const panel = useDashboard((s) => s.state?.services);
  return (
    <Panel
      title="SYSTEM & SERVICE STATUS"
      subtitle="LIVE NETWORK MAP"
      stale={panel?.stale}
      className="row-span-1"
    >
      {!panel ? (
        <div className="text-text-muted text-xs">Chargement…</div>
      ) : (
        <div className="flex gap-3 h-full">
          <svg viewBox="0 0 320 230" className="flex-1 min-w-0">
            {panel.links.map((l, i) => {
              const a = panel.nodes.find((n) => n.id === l.from);
              const b = panel.nodes.find((n) => n.id === l.to);
              if (!a || !b) return null;
              const pa = iso(a.x ?? 0, a.y ?? 0);
              const pb = iso(b.x ?? 0, b.y ?? 0);
              return (
                <line
                  key={i}
                  x1={pa.px}
                  y1={pa.py}
                  x2={pb.px}
                  y2={pb.py}
                  stroke="var(--neon-cyan)"
                  strokeWidth="1"
                  opacity="0.3"
                />
              );
            })}
            {panel.nodes.map((n) => (
              <Node key={n.id} node={n} />
            ))}
          </svg>
          <ul className="w-40 shrink-0 text-[11px] space-y-1 self-center">
            {panel.summary.length === 0 ? (
              <li style={{ color: "var(--status-ok)" }}>All systems nominal.</li>
            ) : (
              panel.summary.map((line, i) => (
                <li key={i} className="leading-tight">
                  {line}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function Node({ node }: { node: ServiceNode }) {
  const { px, py } = iso(node.x ?? 0, node.y ?? 0);
  const color = STATE_COLOR[node.state];
  const pulse = node.state !== "ok";
  return (
    <g>
      <rect
        x={px - 18}
        y={py - 12}
        width="36"
        height="24"
        rx="3"
        fill="#0a1828"
        stroke="var(--neon-cyan)"
        strokeWidth="1"
      />
      <circle
        cx={px + 14}
        cy={py - 8}
        r="3.5"
        fill={color}
        style={pulse ? { animation: "pulse-glow 1.2s ease-in-out infinite" } : undefined}
      />
      <text x={px} y={py + 26} textAnchor="middle" fontSize="9" className="fill-text-primary">
        {node.label}
      </text>
    </g>
  );
}
