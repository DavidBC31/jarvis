import { useDashboard } from "../store";
import { ServiceList } from "./monitoring/ServiceList";

export function MonitoringPage() {
  const panel = useDashboard((s) => s.state?.services);
  const nodes = panel?.nodes ?? [];
  const total = panel?.total ?? nodes.length;
  const up = panel?.upCount ?? nodes.filter((n) => n.state === "ok").length;
  const off = nodes.filter((n) => n.state === "alert").length;
  const allUp = total > 0 && off === 0;
  const accent = off ? "var(--status-alert)" : "var(--status-ok)";

  return (
    <div className="h-full w-full p-6 overflow-auto">
      <div className="mb-4">
        <h1 className="font-display text-xl tracking-[0.25em] neon-text">
          SUPERVISION · TOUS LES SERVICES
        </h1>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
        <span className="font-display tracking-widest" style={{ color: accent }}>
          {total === 0
            ? "EN ATTENTE DE DONNÉES…"
            : allUp
              ? "TOUS LES SERVICES OPÉRATIONNELS"
              : `${off} SERVICE${off > 1 ? "S" : ""} HORS LIGNE`}
        </span>
        <span className="ml-auto text-text-muted text-sm tabular-nums">
          {up}/{total} en ligne
        </span>
      </div>

      {panel?.stale && (
        <p className="text-status-warn text-xs mb-3">
          Données obsolètes — source de supervision injoignable.
        </p>
      )}

      {total === 0 ? (
        <p className="text-text-muted text-sm">Aucun service à afficher pour le moment.</p>
      ) : (
        <div className="text-sm">
          <ServiceList nodes={nodes} />
        </div>
      )}
    </div>
  );
}
