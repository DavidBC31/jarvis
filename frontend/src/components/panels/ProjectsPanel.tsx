import { useDashboard } from "../../store";
import type { KeyStatus, Project } from "../../types";

// ── Palette ──────────────────────────────────────────────────────────────────

const PRIORITY: Record<KeyStatus, { label: string; color: string; bg: string; rank: number; dim?: boolean }> = {
  critical: { label: "Critique",   color: "#f87171", bg: "rgba(248,113,113,0.08)", rank: 0 },
  at_risk:  { label: "À risque",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  rank: 1 },
  on_track: { label: "En cours",   color: "#10b981", bg: "rgba(16,185,129,0.07)",  rank: 2 },
  paused:   { label: "En pause",   color: "#7a6e9e", bg: "rgba(122,110,158,0.06)", rank: 3, dim: true },
  done:     { label: "Terminé",    color: "#a78bfa", bg: "rgba(167,139,250,0.07)", rank: 4, dim: true },
};

// ── Tuile stat ────────────────────────────────────────────────────────────────

function StatTile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.13)" }}
    >
      <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: color ?? "var(--neon-cyan)" }}>
        {value}
      </span>
      <span className="text-[9px] tracking-[0.18em] text-text-muted uppercase">{label}</span>
    </div>
  );
}

// ── Carte projet ──────────────────────────────────────────────────────────────

function ProjectCard({ project: p }: { project: Project }) {
  const prio = PRIORITY[p.keyStatus];
  const ranked = p.sortOrder < 99;
  const isDone = p.keyStatus === "done";

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden transition-transform hover:scale-[1.01]"
      style={{
        background: prio.bg,
        border: `1px solid ${prio.color}30`,
        opacity: prio.dim ? 0.6 : 1,
      }}
    >
      {/* Bande colorée top */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${prio.color}, ${prio.color}30)` }} />

      <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
        {/* Ligne 1 : rang + id + badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {ranked && (
              <span
                className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0"
                style={{ background: prio.color + "30", color: prio.color, border: `1px solid ${prio.color}60` }}
              >
                {p.sortOrder}
              </span>
            )}
            <span
              className="text-[10px] font-display tracking-wider truncate"
              style={{ color: "var(--neon-cyan)" }}
            >
              {p.id}
            </span>
          </div>
          <span
            className="text-[9px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
            style={{ color: prio.color, background: prio.color + "20", border: `1px solid ${prio.color}44` }}
          >
            {prio.label}
          </span>
        </div>

        {/* Nom du projet */}
        <p
          className="text-sm leading-snug flex-1 line-clamp-2"
          style={{ color: "var(--text-primary)" }}
          title={p.name}
        >
          {p.name}
        </p>

        {/* Barre de progression */}
        {isDone ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted">{p.owner}</span>
            <span className="text-xs font-bold" style={{ color: prio.color }}>✓ 100 %</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${p.progress}%`,
                  background: `linear-gradient(90deg, ${prio.color}70, ${prio.color})`,
                  boxShadow: `0 0 8px ${prio.color}60`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted truncate">{p.owner}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: prio.color }}>
                {p.progress} %
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panneau principal ─────────────────────────────────────────────────────────

export function ProjectsPanel() {
  const panel = useDashboard((s) => s.state?.projects);
  const projects = panel?.projects ?? [];

  const total  = projects.length;
  const active = projects.filter((p) => p.keyStatus === "on_track").length;
  const atRisk = projects.filter((p) => p.keyStatus === "at_risk" || p.keyStatus === "critical").length;
  const paused = projects.filter((p) => p.keyStatus === "paused").length;
  const done   = projects.filter((p) => p.keyStatus === "done").length;

  // Séparation prioritaires (sortOrder < 99) / reste
  const pinned = projects.filter((p) => p.sortOrder < 99 && p.keyStatus !== "done" && p.keyStatus !== "paused");
  const rest   = projects.filter((p) => p.sortOrder >= 99 && p.keyStatus !== "done" && p.keyStatus !== "paused");
  const inactive = projects.filter((p) => p.keyStatus === "done" || p.keyStatus === "paused");

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* En-tête */}
      <div
        className="px-6 py-3.5 shrink-0 flex items-center justify-between border-b"
        style={{ borderColor: "rgba(139,92,246,0.15)" }}
      >
        <h1 className="font-display text-base tracking-[0.25em]" style={{ color: "var(--neon-cyan)" }}>
          PROJETS SI
        </h1>
        {panel?.stale && (
          <span className="text-[10px] tracking-widest text-status-warn">DONNÉES OBSOLÈTES</span>
        )}
      </div>

      {/* Tuiles stats */}
      <div className="px-5 py-3 grid grid-cols-5 gap-2.5 shrink-0">
        <StatTile label="Total"     value={total}  color="var(--neon-cyan)" />
        <StatTile label="En cours"  value={active} color="#10b981" />
        <StatTile label="À risque"  value={atRisk} color={atRisk ? "#f59e0b" : "var(--text-muted)"} />
        <StatTile label="En pause"  value={paused} color={paused ? "#60a5fa" : "var(--text-muted)"} />
        <StatTile label="Terminés"  value={done}   color={done   ? "#a78bfa" : "var(--text-muted)"} />
      </div>

      {/* Grille de cartes */}
      {!panel ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">Chargement…</div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-5 pb-5 space-y-4">

          {/* Prioritaires */}
          {pinned.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-display tracking-[0.2em] text-status-warn">★ PRIORITAIRES</span>
                <div className="flex-1 h-px bg-status-warn/20" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {pinned.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            </section>
          )}

          {/* Autres projets actifs */}
          {rest.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-display tracking-[0.2em] text-text-muted">EN COURS</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
              )}
              <div className="grid grid-cols-4 gap-3">
                {rest.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            </section>
          )}

          {/* Terminés & en pause */}
          {inactive.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-display tracking-[0.2em] text-text-muted">TERMINÉS & EN PAUSE</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {inactive.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            </section>
          )}

          {total === 0 && (
            <p className="text-center text-text-muted text-sm py-10">Aucun projet à afficher.</p>
          )}
        </div>
      )}
    </div>
  );
}
