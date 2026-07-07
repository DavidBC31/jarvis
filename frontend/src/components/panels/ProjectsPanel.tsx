import { useDashboard } from "../../store";
import type { KeyStatus, Project } from "../../types";

// ── Palette priorité ────────────────────────────────────────────────────────

const PRIORITY: Record<KeyStatus, { label: string; color: string; rank: number; dim?: boolean }> = {
  critical: { label: "Critique",       color: "var(--status-alert)",    rank: 0 },
  at_risk:  { label: "À risque",       color: "var(--status-warn)",     rank: 1 },
  on_track: { label: "En cours",       color: "var(--status-ok)",       rank: 2 },
  paused:   { label: "En pause",       color: "var(--text-muted)",      rank: 3, dim: true },
  done:     { label: "Terminé",        color: "var(--neon-cyan)",       rank: 4, dim: true },
};

// ── Composants utilitaires ──────────────────────────────────────────────────

function StatTile({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{
        background: "rgba(139,92,246,0.06)",
        border: "1px solid rgba(139,92,246,0.15)",
      }}
    >
      <span
        className="text-3xl font-bold tabular-nums leading-none"
        style={{ color: color ?? "var(--neon-cyan)" }}
      >
        {value}
      </span>
      <span className="text-[10px] tracking-[0.18em] text-text-muted uppercase">{label}</span>
      {sub && <span className="text-[9px] text-text-muted">{sub}</span>}
    </div>
  );
}

function SectionDivider({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mt-4 mb-1">
      <span
        className="text-[10px] font-display tracking-[0.2em] shrink-0"
        style={{ color }}
      >
        {label}
      </span>
      <span className="text-[9px] text-text-muted shrink-0">({count})</span>
      <div className="flex-1 h-px" style={{ background: color + "28" }} />
    </div>
  );
}

function ProjectRow({ project: p }: { project: Project }) {
  const prio = PRIORITY[p.keyStatus];
  const isDone = p.keyStatus === "done";
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors"
      style={{
        opacity: prio.dim ? 0.55 : 1,
        background: "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Indicateur priorité */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: prio.color, boxShadow: `0 0 6px ${prio.color}` }}
      />

      {/* Matricule */}
      <span
        className="w-[5.5rem] text-xs font-display tracking-wider shrink-0 truncate"
        style={{ color: "var(--neon-cyan)" }}
        title={p.id}
      >
        {p.id}
      </span>

      {/* Intitulé */}
      <span className="flex-1 min-w-0 text-sm truncate" title={p.name}>
        {p.name}
      </span>

      {/* Badge statut */}
      <span
        className="text-[9px] tracking-wide px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
        style={{
          color: prio.color,
          background: prio.color + "18",
          border: `1px solid ${prio.color}44`,
        }}
      >
        {prio.label}
      </span>

      {/* Barre d'avancement */}
      {isDone ? (
        <span
          className="w-28 text-right text-xs tabular-nums shrink-0"
          style={{ color: prio.color }}
        >
          ✓ 100 %
        </span>
      ) : (
        <>
          <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
            <div
              className="h-full rounded-full"
              style={{
                width: `${p.progress}%`,
                background: `linear-gradient(90deg, ${prio.color}99, ${prio.color})`,
                boxShadow: `0 0 6px ${prio.color}`,
              }}
            />
          </div>
          <span className="w-10 text-right text-xs tabular-nums shrink-0 text-text-muted">
            {p.progress} %
          </span>
        </>
      )}
    </div>
  );
}

// ── Panneau principal ────────────────────────────────────────────────────────

export function ProjectsPanel() {
  const panel = useDashboard((s) => s.state?.projects);
  const projects = panel?.projects ?? [];

  const total   = projects.length;
  const active  = projects.filter((p) => p.keyStatus === "on_track").length;
  const atRisk  = projects.filter((p) => p.keyStatus === "at_risk" || p.keyStatus === "critical").length;
  const paused  = projects.filter((p) => p.keyStatus === "paused").length;
  const done    = projects.filter((p) => p.keyStatus === "done").length;

  const activeList = projects.filter((p) => p.keyStatus === "on_track" || p.keyStatus === "at_risk" || p.keyStatus === "critical");
  const pausedList = projects.filter((p) => p.keyStatus === "paused");
  const doneList   = projects.filter((p) => p.keyStatus === "done");

  const owners  = Array.from(new Set(projects.map((p) => p.owner).filter(Boolean)));
  const ownerSub = owners.length === 1 ? owners[0].toUpperCase() : `${owners.length} RESPONSABLES`;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── En-tête ──────────────────────────────────────────────────── */}
      <div
        className="px-6 py-4 shrink-0 flex items-center justify-between border-b"
        style={{ borderColor: "rgba(139,92,246,0.18)" }}
      >
        <div>
          <h1
            className="font-display text-lg tracking-[0.25em]"
            style={{ color: "var(--neon-cyan)" }}
          >
            PROJETS SI
          </h1>
          {owners.length > 0 && (
            <p className="text-[10px] tracking-[0.15em] text-text-muted mt-0.5">
              {ownerSub}
            </p>
          )}
        </div>
        {panel?.stale && (
          <span className="text-[10px] tracking-widest text-status-warn">DONNÉES OBSOLÈTES</span>
        )}
      </div>

      {/* ── Tuiles stats ─────────────────────────────────────────────── */}
      <div className="px-6 py-4 grid grid-cols-5 gap-3 shrink-0">
        <StatTile label="Projets"   value={total}  color="var(--neon-cyan)" />
        <StatTile label="En cours"  value={active} color="var(--status-ok)"   sub={active === total && done === 0 ? "Tout actif" : undefined} />
        <StatTile label="À risque"  value={atRisk} color={atRisk ? "var(--status-warn)" : "var(--text-muted)"} />
        <StatTile label="En pause"  value={paused} color={paused ? "var(--status-new)"  : "var(--text-muted)"} />
        <StatTile label="Terminés"  value={done}   color={done   ? "var(--neon-cyan)"   : "var(--text-muted)"} />
      </div>

      {/* ── Liste des projets ─────────────────────────────────────────── */}
      {!panel ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Chargement…
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">

          {/* Projets actifs */}
          {activeList.length > 0 && (
            <>
              <SectionDivider
                label="EN COURS"
                count={activeList.length}
                color="var(--status-ok)"
              />
              {activeList.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </>
          )}

          {/* En pause */}
          {pausedList.length > 0 && (
            <>
              <SectionDivider
                label="EN PAUSE"
                count={pausedList.length}
                color="var(--status-new)"
              />
              {pausedList.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </>
          )}

          {/* Terminés */}
          {doneList.length > 0 && (
            <>
              <SectionDivider
                label="TERMINÉS"
                count={doneList.length}
                color="var(--neon-cyan)"
              />
              {doneList.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </>
          )}

          {total === 0 && (
            <p className="text-center text-text-muted text-sm py-10">
              Aucun projet à afficher.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
