import { useDashboard } from "../store";
import { ServiceList } from "./monitoring/ServiceList";
import { StatusRing } from "./monitoring/StatusRing";
import type { ServiceNode, ServiceState } from "../types";

// Ordre de gravité : les problèmes remontent en tête de liste.
const SEVERITY: Record<ServiceState, number> = { alert: 0, warn: 1, maint: 2, ok: 3 };

function KpiRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-3xl font-extralight tabular-nums leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
        {count}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

export function MonitoringPage() {
  const panel = useDashboard((s) => s.state?.services);
  const nodes = panel?.nodes ?? [];
  const total = panel?.total ?? nodes.length;

  const online   = nodes.filter(n => n.state === "ok").length;
  const degraded = nodes.filter(n => n.state === "warn" || n.state === "maint").length;
  const offline  = nodes.filter(n => n.state === "alert").length;
  const worst: ServiceState = offline ? "alert" : degraded ? "warn" : "ok";

  const sorted: ServiceNode[] = [...nodes].sort(
    (a, b) => SEVERITY[a.state] - SEVERITY[b.state] || a.label.localeCompare(b.label),
  );

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Rail jauge gauche ── */}
      <aside className="shrink-0 flex flex-col justify-between px-9 py-9"
        style={{ width: 360, borderRight: "1px solid rgba(255,255,255,0.05)" }}>

        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
            Système d'information
          </p>
          <h1 className="text-2xl font-light tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
            Services <span style={{ color: "var(--neon-cyan)" }}>supervisés</span>
          </h1>
        </div>

        <div className="py-4">
          <StatusRing up={online} total={total} worst={worst} />
        </div>

        <div className="space-y-4">
          <KpiRow label="En ligne"  value={online}   color="var(--status-ok)" />
          <KpiRow label="Dégradés"  value={degraded} color={degraded ? "var(--status-warn)" : "var(--text-muted)"} />
          <KpiRow label="Hors ligne" value={offline} color={offline ? "var(--status-alert)" : "var(--text-muted)"} />
          {panel?.stale && (
            <p className="text-[10px] tracking-widest pt-1" style={{ color: "var(--status-warn)" }}>
              données obsolètes — source injoignable
            </p>
          )}
        </div>
      </aside>

      {/* ── Liste des services ── */}
      <div className="flex-1 min-h-0 overflow-auto px-8 py-8 animate-fade-in">
        <SectionLabel label="Tous les services" count={total} />

        {total === 0 ? (
          <div className="py-10 text-sm space-y-2" style={{ color: "var(--text-muted)" }}>
            <p>Aucun service à afficher.</p>
            <p className="text-[12px] opacity-80">
              En attente de la source Uptime Kuma — vérifie <code>UPTIME_KUMA_API_KEY</code> ou{" "}
              <code>UPTIME_KUMA_STATUS_SLUG</code> dans le <code>.env</code>.
            </p>
          </div>
        ) : (
          <ServiceList nodes={sorted} />
        )}
      </div>
    </div>
  );
}
