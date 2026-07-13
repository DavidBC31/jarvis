import type { ServiceNode, ServiceState } from "../../types";

export const STATE_COLOR: Record<ServiceState, string> = {
  ok: "var(--status-ok)",
  warn: "var(--status-warn)",
  alert: "var(--status-alert)",
  maint: "#fb923c",
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
  const ok = node.state === "ok";
  const beats = node.beats ?? [];
  const padded: (ServiceState | null)[] = [
    ...Array(Math.max(0, BEATS_SHOWN - beats.length)).fill(null),
    ...beats.slice(-BEATS_SHOWN),
  ];

  // Secondaire : détail s'il existe, sinon libellé d'état (masqué si OK sans détail).
  const sub = node.detail ?? (ok ? (node.latencyMs != null ? `${node.latencyMs} ms` : null) : STATE_LABEL[node.state]);

  return (
    <div
      className="grid items-center gap-6 px-4 rounded-xl transition-colors duration-150"
      style={{ gridTemplateColumns: "minmax(0,1fr) 12rem 4rem", minHeight: 54 }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.035)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Nom + secondaire */}
      <div className="min-w-0 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animation: ok ? undefined : "pulse-soft 1.6s ease-in-out infinite",
          }} />
        <div className="min-w-0">
          <div className="truncate text-[18px] font-medium leading-tight"
            style={{ color: "var(--text-primary)" }} title={node.label}>
            {node.label}
          </div>
          {sub && (
            <div className="truncate text-[11px] leading-tight mt-0.5"
              style={{ color: ok ? "var(--text-muted)" : color }}>
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* Historique heartbeats */}
      <div className="flex items-end justify-end gap-[2px] h-6">
        {padded.map((b, i) => (
          <span key={i} className="w-[3px] rounded-sm"
            style={{
              height: b ? "100%" : "35%",
              background: b ? STATE_COLOR[b] : "rgba(255,255,255,0.08)",
            }} />
        ))}
      </div>

      {/* Uptime */}
      <span className="text-lg font-extralight tabular-nums text-right"
        style={{ color: ok ? "var(--text-primary)" : color }}>
        {node.uptimePercent != null ? (
          <>{node.uptimePercent}<span className="text-xs font-light opacity-60">%</span></>
        ) : "—"}
      </span>
    </div>
  );
}

export function ServiceList({ nodes }: { nodes: ServiceNode[] }) {
  return (
    <div className="flex flex-col">
      {nodes.map((n) => <ServiceRow key={n.id} node={n} />)}
    </div>
  );
}
