import { Panel } from "../Panel";
import { useDashboard } from "../../store";
import type { KeyStatus } from "../../types";

const DOT: Record<KeyStatus, string> = {
  on_track: "var(--status-ok)",
  at_risk: "var(--status-warn)",
  critical: "var(--status-alert)",
};

export function ProjectsPanel() {
  const panel = useDashboard((s) => s.state?.projects);
  return (
    <Panel
      title="ACTIVE IT PROJECTS"
      subtitle="PRIORITY & PROGRESS"
      stale={panel?.stale}
    >
      {!panel ? (
        <div className="text-text-muted text-xs">Chargement…</div>
      ) : (
        <ul className="text-xs space-y-2">
          {panel.projects.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: DOT[p.keyStatus], boxShadow: `0 0 6px ${DOT[p.keyStatus]}` }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <span className="truncate">{p.name}</span>
                  <span
                    className="ml-2 whitespace-nowrap"
                    style={{ color: p.overdue ? "var(--status-alert)" : "var(--text-muted)" }}
                  >
                    {p.dueDate}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${p.progress}%`,
                      background: "var(--neon-cyan)",
                      boxShadow: "0 0 8px var(--neon-cyan)",
                    }}
                  />
                </div>
              </div>
              <span className="w-8 text-right tabular-nums">{p.progress}%</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
