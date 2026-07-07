import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  stale?: boolean;
  accent?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, stale, accent, children, className }: PanelProps) {
  const color = accent ?? "var(--neon-cyan)";
  const dim   = accent ?? "var(--neon-cyan-dim)";
  return (
    <section
      className={`rounded-2xl flex flex-col min-h-0 ${className ?? ""}`}
      style={{
        background: "var(--bg-panel)",
        opacity: stale ? 0.55 : 1,
        border: `1px solid ${dim}`,
        boxShadow: accent
          ? `0 0 0 1px ${accent}40, 0 0 24px ${accent}30, inset 0 0 30px rgba(0,0,0,0.4)`
          : "0 0 0 1px rgba(0,0,0,0.5), 0 4px 24px rgba(139,92,246,0.08), inset 0 0 30px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="flex items-baseline justify-between gap-2 px-4 py-3 shrink-0 border-b"
        style={{ borderColor: dim }}
      >
        <h2
          className="font-display text-sm tracking-[0.22em] truncate"
          style={{ color }}
        >
          {title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {subtitle && (
            <span className="text-[10px] tracking-widest text-text-muted">{subtitle}</span>
          )}
          {stale && (
            <span className="text-[10px] tracking-widest text-status-warn">DONNÉES OBSOLÈTES</span>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-4">{children}</div>
    </section>
  );
}
