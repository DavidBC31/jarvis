import type { ServiceNode, ServiceState } from "../../types";

export const STATE_COLOR: Record<ServiceState, string> = {
  ok: "var(--status-ok)",
  warn: "var(--status-warn)",
  alert: "var(--status-alert)",
  maint: "#ff9a3a",
};
export const STATE_LABEL: Record<ServiceState, string> = {
  ok: "Opérationnel",
  warn: "Dégradé",
  alert: "Hors ligne",
  maint: "Maintenance",
};

const BEATS_SHOWN = 30;

export function ServiceRow({ node }: { node: ServiceNode }) {
  const color = STATE_COLOR[node.state];
  const beats = node.beats ?? [];
  // Aligne les barres à droite (les plus récentes à droite), comble à gauche.
  const padded: (ServiceState | null)[] = [
    ...Array(Math.max(0, BEATS_SHOWN - beats.length)).fill(null),
    ...beats.slice(-BEATS_SHOWN),
  ];

  return (
    <li className="flex items-center gap-3 py-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{
          background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: node.state !== "ok" ? "pulse-glow 1.4s ease-in-out infinite" : undefined,
        }}
      />
      <div className="min-w-0 w-44 shrink-0">
        <div className="truncate">{node.label}</div>
        <div className="text-[10px] truncate" style={{ color }}>
          {STATE_LABEL[node.state]}
          {node.detail ? ` · ${node.detail}` : ""}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex items-end justify-end gap-[2px] h-5">
        {padded.map((b, i) => (
          <span
            key={i}
            className="w-[3px] rounded-sm"
            style={{
              height: b ? "100%" : "40%",
              background: b ? STATE_COLOR[b] : "rgba(255,255,255,0.10)",
            }}
          />
        ))}
      </div>

      <span className="tabular-nums text-text-muted w-14 text-right shrink-0">
        {node.uptimePercent != null ? `${node.uptimePercent}%` : "—"}
      </span>
    </li>
  );
}

export function ServiceList({ nodes }: { nodes: ServiceNode[] }) {
  return (
    <ul className="divide-y divide-white/5">
      {nodes.map((n) => (
        <ServiceRow key={n.id} node={n} />
      ))}
    </ul>
  );
}
