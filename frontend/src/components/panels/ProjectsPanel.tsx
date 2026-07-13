import { useDashboard } from "../../store";
import type { KeyStatus, Project } from "../../types";
import { OrbitSphere } from "../OrbitSphere";

// ── Palette statuts ───────────────────────────────────────────────────────────

const STATUS: Record<KeyStatus, { label: string; color: string; muted?: boolean }> = {
  critical: { label: "Critique",  color: "#f87171" },
  at_risk:  { label: "À risque",  color: "#fbbf24" },
  on_track: { label: "En cours",  color: "#34d399" },
  paused:   { label: "En pause",  color: "#55607a", muted: true },
  done:     { label: "Terminé",   color: "#38bdf8", muted: true },
};

// ── Carte projet — le NOM est la vedette ──────────────────────────────────────

function Card({ project: p }: { project: Project }) {
  const s = STATUS[p.keyStatus];
  const ranked = p.sortOrder < 99;
  const isDone = p.keyStatus === "done";

  return (
    <div
      className="rounded-2xl flex flex-col gap-5 px-7 py-6 transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.022)",
        border: "1px solid rgba(255,255,255,0.05)",
        opacity: s.muted ? 0.55 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.045)";
        e.currentTarget.style.borderColor = s.color + "45";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.022)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
      }}
    >
      {/* Ligne haute : rang + matricule + statut */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {ranked && (
            <span className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md"
              style={{ color: s.color, background: s.color + "16" }}>
              #{p.sortOrder}
            </span>
          )}
          <span className="text-[11px] font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>
            {p.id}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: s.color, boxShadow: s.muted ? "none" : `0 0 6px ${s.color}` }} />
          <span className="text-[11px]" style={{ color: s.color }}>{s.label}</span>
        </div>
      </div>

      {/* NOM — grand et lisible */}
      <p className="text-[1.7rem] font-normal leading-[1.15] tracking-tight line-clamp-2"
        style={{ color: "var(--text-primary)" }}
        title={p.name}>
        {p.name}
      </p>

      {/* Avancement */}
      {isDone ? (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.owner}</span>
          <span className="text-base font-medium" style={{ color: s.color }}>✓ Terminé</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.owner}</span>
            <span className="text-[1.9rem] font-extralight tabular-nums leading-none" style={{ color: s.color }}>
              {p.progress}<span className="text-base font-light opacity-60">%</span>
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${p.progress}%`,
                background: s.color,
                boxShadow: p.progress > 0 ? `0 0 8px ${s.color}60` : "none",
              }} />
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

// ── Ligne KPI (rail gauche) ───────────────────────────────────────────────────

function KpiRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-3xl font-extralight tabular-nums leading-none" style={{ color }}>{value}</span>
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
    <div className="h-full flex overflow-hidden">

      {/* ── Rail graphique gauche ── */}
      <aside className="shrink-0 flex flex-col justify-between px-9 py-9"
        style={{ width: 360, borderRight: "1px solid rgba(255,255,255,0.05)" }}>

        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
            Système d'information
          </p>
          <h1 className="text-2xl font-light tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
            Projets <span style={{ color: "var(--neon-cyan)" }}>en cours</span>
          </h1>
        </div>

        <div className="py-4">
          <OrbitSphere count={total} />
        </div>

        <div className="space-y-4">
          <KpiRow label="En cours" value={active} color="var(--status-ok)" />
          <KpiRow label="À risque" value={atRisk} color={atRisk ? "var(--status-warn)" : "var(--text-muted)"} />
          <KpiRow label="En pause" value={paused} color={paused ? "var(--status-new)" : "var(--text-muted)"} />
          <KpiRow label="Terminés" value={done}   color={done ? "var(--neon-cyan)" : "var(--text-muted)"} />
          {panel?.stale && (
            <p className="text-[10px] tracking-widest pt-1" style={{ color: "var(--status-warn)" }}>
              données obsolètes
            </p>
          )}
        </div>
      </aside>

      {/* ── Projets ── */}
      {!panel ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
          Chargement…
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto px-9 py-9 space-y-9 animate-fade-in">

          {pinned.length > 0 && (
            <div>
              <SectionLabel label="Prioritaires" count={pinned.length} />
              <div className="grid grid-cols-2 gap-5">
                {pinned.map(p => <Card key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {running.length > 0 && (
            <div>
              {pinned.length > 0 && <SectionLabel label="En cours" count={running.length} />}
              <div className="grid grid-cols-2 gap-5">
                {running.map(p => <Card key={p.id} project={p} />)}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <SectionLabel label="Terminés & en pause" count={inactive.length} />
              <div className="grid grid-cols-2 gap-5">
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
