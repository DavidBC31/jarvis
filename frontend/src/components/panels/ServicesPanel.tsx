import { Panel } from "../Panel";
import { useDashboard } from "../../store";
import { STATE_COLOR, STATE_LABEL } from "../monitoring/ServiceList";
import type { ServiceNode } from "../../types";

export function ServicesPanel() {
  const panel = useDashboard((s) => s.state?.services);
  const nodes = panel?.nodes ?? [];
  const total = panel?.total ?? nodes.length;
  const up = panel?.upCount ?? nodes.filter((n) => n.state === "ok").length;

  const off = nodes.filter((n) => n.state === "alert");
  const degraded = nodes.filter((n) => n.state === "warn");
  const maint = nodes.filter((n) => n.state === "maint");

  // Code couleur : rouge si ≥1 service off, orange si dégradé, vert sinon.
  const accent = off.length
    ? "var(--status-alert)"
    : degraded.length
      ? "var(--status-warn)"
      : "var(--status-ok)";

  const headline = off.length
    ? `${off.length} SERVICE${off.length > 1 ? "S" : ""} HORS LIGNE`
    : degraded.length
      ? `${degraded.length} SERVICE${degraded.length > 1 ? "S" : ""} DÉGRADÉ${degraded.length > 1 ? "S" : ""}`
      : "TOUT EST OPÉRATIONNEL";

  return (
    <Panel
      title="SUPERVISION"
      subtitle="ÉTAT GLOBAL"
      stale={panel?.stale}
      accent={off.length ? accent : undefined}
    >
      {!panel ? (
        <div className="text-text-muted text-xs">Chargement…</div>
      ) : total === 0 ? (
        <div className="text-text-muted text-xs">Supervision en attente de données…</div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full shrink-0"
              style={{
                background: accent,
                boxShadow: `0 0 12px ${accent}`,
                animation: off.length ? "pulse-glow 1.2s ease-in-out infinite" : undefined,
              }}
            />
            <div className="min-w-0">
              <div className="font-display tracking-widest text-lg" style={{ color: accent }}>
                {headline}
              </div>
              <div className="text-[11px] text-text-muted tabular-nums">
                {up}/{total} services en ligne
                {maint.length ? ` · ${maint.length} en maintenance` : ""}
              </div>
            </div>
          </div>

          {/* Services qui ressortent : off (rouge) puis dégradés (orange). */}
          {(off.length > 0 || degraded.length > 0) && (
            <div className="mt-3 flex-1 min-h-0 overflow-auto flex flex-wrap gap-2 content-start">
              {[...off, ...degraded].map((n) => (
                <Chip key={n.id} node={n} />
              ))}
            </div>
          )}

          <a
            href="#monitoring"
            className="mt-auto self-end text-[11px] tracking-widest pt-2"
            style={{ color: "var(--neon-cyan)" }}
          >
            VOIR LE DÉTAIL →
          </a>
        </div>
      )}
    </Panel>
  );
}

function Chip({ node }: { node: ServiceNode }) {
  const color = STATE_COLOR[node.state];
  return (
    <span
      className="px-2 py-1 rounded text-[11px] whitespace-nowrap max-w-full truncate"
      style={{ background: `${color}1a`, border: `1px solid ${color}`, color }}
      title={node.detail ? `${node.label} — ${node.detail}` : node.label}
    >
      ● {node.label} · {STATE_LABEL[node.state]}
    </span>
  );
}
