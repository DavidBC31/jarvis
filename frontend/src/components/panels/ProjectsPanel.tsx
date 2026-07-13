import { useDashboard } from "../../store";
import type { KeyStatus, Project } from "../../types";

// ── Palette statuts ───────────────────────────────────────────────────────────
// Une seule couleur par statut, portée par le point + le pourcentage + la barre.

const STATUS: Record<KeyStatus, { label: string; color: string; rank: number; muted?: boolean }> = {
  critical: { label: "Critique",  color: "#f87171", rank: 0 },
  at_risk:  { label: "À risque",  color: "#fbbf24", rank: 1 },
  on_track: { label: "En cours",  color: "#34d399", rank: 2 },
  paused:   { label: "En pause",  color: "#55607a", rank: 3, muted: true },
  done:     { label: "Terminé",   color: "#38bdf8", rank: 4, muted: true },
};

// ── KPI héroïque (sans cadre) ─────────────────────────────────────────────────

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-5xl font-extralight tabular-nums leading-none"
        style={{ color: color ?? "var(--neon-cyan)" }}>
        {value}
      </span>
      <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

// ── Carte projet ──────────────────────────────────────────────────────────────

function Card({ project: p }: { project: Project }) {
  const s = STATUS[p.keyStatus];
  const ranked = p.sortOrder < 99;
  const isDone = p.keyStatus === "done";

  return (
    <div
      className="rounded-2xl flex flex-col gap-5 px-6 py-6 transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        opacity: s.muted ? 0.5 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = s.color + "40";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
      }}
    >
      {/* Ligne 1 : matricule + statut */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {ranked && (
            <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md"
              style={{ color: s.color, background: s.color + "16" }}>
              #{p.sortOrder}
            </span>
          )}
          <span className="text-[11px] font-mono tracking-wider"
            style={{ color: "var(--text-muted)" }}>
            {p.id}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: s.color, boxShadow: s.muted ? "none" : `0 0 6px ${s.color}` }} />
          <span className="text-[10px]" style={{ color: s.color }}>
            {s.label}
          </span>
        </div>
      </div>

      {/* Nom du projet */}
      <p className="text-[15px] font-normal leading-snug line-clamp-2 flex-1"
        style={{ color: "var(--text-primary)" }}
        title={p.name}>
        {p.name}
      </p>

      {/* Avancement */}
      {isDone ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.owner}</span>
          <span className="text-sm font-medium" style={{ color: s.color }}>✓ Terminé</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.owner}</span>
            <span className="text-2xl font-light tabular-nums leading-none" style={{ color: s.color }}>
              {p.progress}<span className="text-sm font-light opacity-60">%</span>
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${p.progress}%`,
                background: s.color,
                boxShadow: p.progress > 0 ? `0 0 8px ${s.color}60` : "none",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Séparateur de section ─────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
        {count}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ── Panneau ───────────────────────────────────────────────────────────────────

export function ProjectsPanel() {
  const panel = useDashboard((s) => s.state?.projects);
  const all   = panel?.projects ?? [];

  const total  = all.length;
  const active = all.filter(p => p.keyStatus === "on_track").length;
  const atRisk = all.filter(p => p.keyStatus === "at_risk" || p.keyStatus === "critical").length;
  const paused = all.filter(p => p.keyStatus === "paused").length;
  const done   = all.filter(p => p.keyStatus === "done").length;

  const pinned   = all.filter(p => p.sortOrder < 99 && p.keyStatus !== "done" && p.keyStatus !== "paused");
  const running  = all.filter(p => p.sortOrder >= 99 && p.keyStatus !== "done" && p.keyStatus !== "paused");
  const inactive = all.filter(p => p.keyStatus === "done" || p.keyStatus === "paused");

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* En-tête + KPI, sur une même bande aérée */}
      <div className="px-10 pt-9 pb-8 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[0.28em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
              Système d'information
            </p>
            <h1 className="text-2xl font-light tracking-tight" style={{ color: "var(--text-primary)" }}>
              Projets <span style={{ color: "var(--neon-cyan)" }}>en cours</span>
            </h1>
          </div>
          {panel?.stale && (
            <span className="text-[10px] tracking-widest" style={{ color: "var(--status-warn)" }}>
              données obsolètes
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-6">
          <Kpi label="Total"    value={total}  color="var(--neon-cyan)" />
          <Kpi label="En cours" value={active} color="var(--status-ok)" />
          <Kpi label="À risque" value={atRisk} color={atRisk ? "var(--status-warn)" : "var(--text-muted)"} />
          <Kpi label="En pause" value={paused} color={paused ? "var(--status-new)"  : "var(--text-muted)"} />
          <Kpi label="Terminés" value={done}   color={done   ? "var(--neon-cyan)"   : "var(--text-muted)"} />
        </div>
      </div>

      {/* Grille de cartes */}
      {!panel ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
          Chargement…
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-10 py-8 space-y-9 animate-fade-in">

          {/* Prioritaires */}
          {pinned.length > 0 && (
            <div>
              <SectionLabel label="Prioritaires" count={pinned.length} />
              <div className="grid grid-cols-3 gap-5">
                {pinned.map(p => <Card key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {/* En cours */}
          {running.length > 0 && (
            <div>
              {pinned.length > 0 && <SectionLabel label="En cours" count={running.length} />}
              <div className="grid grid-cols-3 gap-5">
                {running.map(p => <Card key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {/* Terminés & en pause */}
          {inactive.length > 0 && (
            <div>
              <SectionLabel label="Terminés & en pause" count={inactive.length} />
              <div className="grid grid-cols-3 gap-5">
                {inactive.map(p => <Card key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
              Aucun projet à afficher.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
