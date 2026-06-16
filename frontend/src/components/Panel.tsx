import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  stale?: boolean;
  children: ReactNode;
  className?: string;
}

// Coque de panneau HUD : titre, liseré néon, indicateur "stale".
export function Panel({ title, subtitle, stale, children, className }: PanelProps) {
  return (
    <section
      className={`neon-border rounded-md p-3 flex flex-col min-h-0 ${className ?? ""}`}
      style={{ background: "var(--bg-panel)", opacity: stale ? 0.5 : 1 }}
    >
      <div className="flex items-baseline justify-between mb-2 shrink-0">
        <h2 className="font-display text-sm tracking-[0.25em] neon-text">{title}</h2>
        {subtitle && (
          <span className="text-[10px] tracking-widest text-text-muted">{subtitle}</span>
        )}
        {stale && (
          <span className="text-[10px] tracking-widest text-status-warn">DATA STALE</span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </section>
  );
}
