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

// ── Ligne projet actif — priorité · nom · avancement ──────────────────────────

function Row({ project: p, rank }: { project: Project; rank: number }) {
  const s = STATUS[p.keyStatus];
  const pinned = p.sortOrder < 99;

  return (
    <div
      className="grid items-center gap-6 px-4 rounded-xl transition-colors duration-150"
      style={{ gridTemplateColumns: "3rem minmax(0,1fr) 13rem 4rem", minHeight: 56 }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.035)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Priorité (rang) */}
      <div className="flex items-center justify-center">
        <span
          className="font-hero text-[13px] font-medium tabular-nums w-9 h-7 flex items-center justify-center rounded-lg"
          style={
            pinned
              ? { color: "var(--neon-cyan)", background: "rgba(56,189,248,0.12)" }
              : { color: "var(--text-muted)" }
          }
        >
          {String(rank).padStart(2, "0")}
        </span>
      </div>

      {/* Nom (+ matricule discret) */}
      <div className="min-w-0 flex items-baseline gap-3">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 self-center"
          style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
        <span className="truncate text-[19px] font-medium leading-tight"
          style={{ color: "var(--text-primary)" }} title={p.name}>
          {p.name}
        </span>
        <span className="text-[10px] font-mono tracking-wider shrink-0" style={{ color: "var(--text-muted)" }}>
          {p.id}
        </span>
      </div>

      {/* Barre d'avancement */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${p.progress}%`,
            background: s.color,
            boxShadow: p.progress > 0 ? `0 0 8px ${s.color}55` : "none",
          }} />
      </div>

      {/* Taux */}
      <span className="text-xl font-extralight tabular-nums text-right" style={{ color: s.color }}>
        {p.progress}<span className="text-xs font-light opacity-60">%</span>
      </span>
    </div>
  );
}

// ── Puce projet inactif ───────────────────────────────────────────────────────

function Chip({ project: p }: { project: Project }) {
  const s = STATUS[p.keyStatus];
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs max-w-[15rem]"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
      <span className="truncate" title={p.name} style={{ color: "var(--text-primary)", opacity: 0.7 }}>{p.name}</span>
      <span style={{ color: s.color, opacity: 0.8 }}>{s.label}</span>
    </span>
  );
}

// ── Séparateur de section ─────────────────────────────────────────────────────

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
  const active = all.filter(p => p.keyStatus !== "done" && p.keyStatus !== "paused");
  const atRisk = all.filter(p => p.keyStatus === "at_risk" || p.keyStatus === "critical").length;
  const paused = all.filter(p => p.keyStatus === "paused").length;
  const done   = all.filter(p => p.keyStatus === "done").length;
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
          <KpiRow label="Actifs"   value={active.length} color="var(--status-ok)" />
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
        <div className="flex-1 min-h-0 overflow-auto px-8 py-8 flex flex-col animate-fade-in">

          {/* Liste classée par priorité */}
          <SectionLabel label="Par priorité" count={active.length} />
          <div className="flex flex-col">
            {active.map((p, i) => <Row key={p.id} project={p} rank={i + 1} />)}
          </div>

          {active.length === 0 && (
            <p className="text-sm py-8" style={{ color: "var(--text-muted)" }}>
              Aucun projet actif.
            </p>
          )}

          {/* Terminés & en pause — bande compacte */}
          {inactive.length > 0 && (
            <div className="mt-auto pt-7">
              <SectionLabel label="Terminés & en pause" count={inactive.length} />
              <div className="flex flex-wrap gap-2">
                {inactive.map(p => <Chip key={p.id} project={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
