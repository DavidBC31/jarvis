import { useDashboard } from "../../store";
import type { KeyStatus, Project } from "../../types";

// ── Palette statuts ───────────────────────────────────────────────────────────
// Une seule couleur par statut, utilisée de façon très sobre.

const STATUS: Record<KeyStatus, { label: string; color: string; rank: number; muted?: boolean }> = {
  critical: { label: "Critique",  color: "#f87171", rank: 0 },
  at_risk:  { label: "À risque",  color: "#fbbf24", rank: 1 },
  on_track: { label: "En cours",  color: "#34d399", rank: 2 },
  paused:   { label: "En pause",  color: "#5a5680", rank: 3, muted: true },
  done:     { label: "Terminé",   color: "#818cf8", rank: 4, muted: true },
};

// ── Tuile stat ────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
      <span className="text-4xl font-semibold tabular-nums leading-none"
        style={{ color: color ?? "var(--neon-cyan)" }}>
        {value}
      </span>
      <span className="text-[10px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
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
      className="rounded-2xl flex flex-col gap-4 px-5 py-5 transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.055)",
        borderLeft: `3px solid ${s.color}`,
        opacity: s.muted ? 0.55 : 1,
        boxShadow: s.muted ? "none" : `0 4px 24px rgba(0,0,0,0.25)`,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
    >
      {/* Ligne 1 : rang + matricule */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {ranked && (
            <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
              style={{ color: s.color, background: s.color + "18" }}>
              #{p.sortOrder}
            </span>
          )}
          <span className="text-[11px] font-mono tracking-wider"
            style={{ color: "var(--neon-cyan)", opacity: 0.8 }}>
            {p.id}
          </span>
        </div>
        {/* Point statut */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: s.color, boxShadow: `0 0 5px ${s.color}` }} />
          <span className="text-[10px]" style={{ color: s.color }}>
            {s.label}
          </span>
        </div>
      </div>

      {/* Nom du projet */}
      <p className="text-[13px] font-medium leading-snug line-clamp-2 flex-1"
        style={{ color: "var(--text-primary)" }}
        title={p.name}>
        {p.name}
      </p>

      {/* Avancement */}
      {isDone ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.owner}</span>
          <span className="text-sm font-semibold" style={{ color: s.color }}>✓ Terminé</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{p.owner}</span>
            <span className="text-base font-bold tabular-nums" style={{ color: s.color }}>
              {p.progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${p.progress}%`,
                background: `linear-gradient(90deg, ${s.color}70, ${s.color})`,
                boxShadow: p.progress > 0 ? `0 0 8px ${s.color}50` : "none",
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
    <div className="flex items-center gap-3 mt-2 mb-1">
      <span className="text-[10px] tracking-widest font-medium" style={{ color: "var(--text-muted)" }}>
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

      {/* En-tête */}
      <div className="px-7 pt-6 pb-5 shrink-0 flex items-end justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
            Système d'information
          </p>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--neon-cyan)" }}>
            Projets
          </h1>
        </div>
        {panel?.stale && (
          <span className="text-[10px] tracking-widest" style={{ color: "var(--status-warn)" }}>
            données obsolètes
          </span>
        )}
      </div>

      {/* Tuiles stats */}
      <div className="px-7 py-5 grid grid-cols-5 gap-3 shrink-0">
        <Stat label="Total"    value={total}  color="var(--neon-cyan)" />
        <Stat label="En cours" value={active} color="var(--status-ok)" />
        <Stat label="À risque" value={atRisk} color={atRisk ? "var(--status-warn)" : "var(--text-muted)"} />
        <Stat label="En pause" value={paused} color={paused ? "var(--status-new)"  : "var(--text-muted)"} />
        <Stat label="Terminés" value={done}   color={done   ? "var(--neon-cyan)"   : "var(--text-muted)"} />
      </div>

      {/* Grille de cartes */}
      {!panel ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
          Chargement…
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-7 pb-7 space-y-5 animate-fade-in">

          {/* Prioritaires */}
          {pinned.length > 0 && (
            <div>
              <SectionLabel label="Prioritaires" count={pinned.length} />
              <div className="grid grid-cols-3 gap-3 mt-2">
                {pinned.map(p => <Card key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {/* En cours */}
          {running.length > 0 && (
            <div>
              {pinned.length > 0 && <SectionLabel label="En cours" count={running.length} />}
              <div className="grid grid-cols-3 gap-3 mt-2">
                {running.map(p => <Card key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {/* Terminés & en pause */}
          {inactive.length > 0 && (
            <div>
              <SectionLabel label="Terminés & en pause" count={inactive.length} />
              <div className="grid grid-cols-3 gap-3 mt-2">
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
