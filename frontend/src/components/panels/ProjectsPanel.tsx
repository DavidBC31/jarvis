import { Panel } from "../Panel";
import { useDashboard } from "../../store";
import type { KeyStatus, Project } from "../../types";

const PRIORITY: Record<KeyStatus, { label: string; color: string; rank: number }> = {
  critical: { label: "Critique", color: "var(--status-alert)", rank: 0 },
  at_risk: { label: "À risque", color: "var(--status-warn)", rank: 1 },
  on_track: { label: "Sur les rails", color: "var(--status-ok)", rank: 2 },
};

export function ProjectsPanel() {
  const panel = useDashboard((s) => s.state?.projects);
  const projects = panel?.projects ?? [];

  // Responsable unique → affiché une fois dans le sous-titre (sinon par ligne).
  const owners = Array.from(new Set(projects.map((p) => p.owner).filter(Boolean)));
  const singleOwner = owners.length === 1 ? owners[0] : null;
  const subtitle = singleOwner
    ? `${projects.length} PROJETS · ${singleOwner.toUpperCase()}`
    : `${projects.length} PROJETS`;

  // Tri : priorité (critique d'abord) puis avancement décroissant.
  const sorted = [...projects].sort(
    (a, b) =>
      PRIORITY[a.keyStatus].rank - PRIORITY[b.keyStatus].rank ||
      b.progress - a.progress,
  );

  return (
    <Panel title="PROJETS SI" subtitle={panel ? subtitle : undefined} stale={panel?.stale}>
      {!panel ? (
        <div className="text-text-muted text-xs">Chargement…</div>
      ) : (
        <ul className="text-xs h-full overflow-auto divide-y divide-white/5 pr-1">
          {sorted.map((p) => (
            <Row key={p.id} project={p} showOwner={!singleOwner} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Row({ project: p, showOwner }: { project: Project; showOwner: boolean }) {
  const prio = PRIORITY[p.keyStatus];
  return (
    <li className="flex items-center gap-2.5 py-1.5 pl-2 border-l-2" style={{ borderColor: prio.color }}>
      <span
        className="font-display tracking-wider shrink-0 w-16 truncate"
        style={{ color: "var(--neon-cyan)" }}
        title={p.id}
      >
        {p.id}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate" title={p.name}>
            {p.name}
          </span>
          <span
            className="text-[9px] tracking-wide shrink-0 px-1 rounded"
            style={{ color: prio.color, border: `1px solid ${prio.color}55` }}
          >
            {prio.label}
          </span>
        </div>
        {showOwner && p.owner && (
          <div className="text-[10px] text-text-muted truncate">{p.owner}</div>
        )}
      </div>

      {/* Avancement */}
      <div className="w-24 shrink-0 h-1.5 rounded bg-white/10 overflow-hidden">
        <div
          className="h-full rounded"
          style={{
            width: `${p.progress}%`,
            background: prio.color,
            boxShadow: `0 0 6px ${prio.color}`,
          }}
        />
      </div>
      <span className="w-9 text-right tabular-nums shrink-0">{p.progress}%</span>
    </li>
  );
}
