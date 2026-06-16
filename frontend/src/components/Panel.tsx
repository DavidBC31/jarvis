import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  stale?: boolean;
  accent?: string; // couleur de liseré/halo (ex. alerte) — défaut néon cyan
  children: ReactNode;
  className?: string;
}

// Coque de panneau HUD : titre, liseré néon, indicateur "stale".
export function Panel({ title, subtitle, stale, accent, children, className }: PanelProps) {
  const border = accent ?? "var(--neon-cyan-dim, rgba(64,224,255,0.25))";
  return (
    <section
      className={`rounded-md flex flex-col min-h-0 ${className ?? ""}`}
      style={{
        background: "var(--bg-panel)",
        opacity: stale ? 0.55 : 1,
        border: `1px solid ${accent ?? "var(--neon-cyan)"}`,
        boxShadow: accent
          ? `0 0 0 1px ${accent}, 0 0 18px ${accent}55, inset 0 0 24px rgba(0,0,0,0.35)`
          : "0 0 0 1px rgba(0,0,0,0.4), inset 0 0 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-baseline justify-between gap-2 px-3 py-2 shrink-0 border-b"
        style={{ borderColor: border }}
      >
        <h2 className="font-display text-sm tracking-[0.22em] truncate" style={{ color: accent ?? "var(--neon-cyan)" }}>
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
      <div className="flex-1 min-h-0 overflow-hidden p-3">{children}</div>
    </section>
  );
}
