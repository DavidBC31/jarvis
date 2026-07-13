// Jauge circulaire de disponibilité — sœur de la sphère orbitale des projets.
// Anneau rempli au prorata des services en ligne, couleur = pire état constaté.

import type { ServiceState } from "../../types";

const CY = "rgba(56,189,248,";
const COLOR: Record<Exclude<ServiceState, never>, string> = {
  ok: "#34d399", warn: "#fbbf24", alert: "#f87171", maint: "#fb923c",
};

export function StatusRing({ up, total, worst }: { up: number; total: number; worst: ServiceState }) {
  const frac = total > 0 ? up / total : 0;
  const R = 84;
  const C = 2 * Math.PI * R;
  const color = COLOR[worst];

  return (
    <div className="relative w-full mx-auto float-soft" style={{ maxWidth: 260 }}>
      <svg viewBox="0 0 220 220" className="w-full h-auto block" aria-hidden>
        <defs>
          <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CY + "0.22)"} />
            <stop offset="60%" stopColor={CY + "0.05)"} />
            <stop offset="100%" stopColor={CY + "0)"} />
          </radialGradient>
        </defs>

        <circle cx="110" cy="110" r="100" fill="url(#ringGlow)" />

        {/* Anneau pointillé extérieur (lent) */}
        <g className="spin-c-60">
          <circle cx="110" cy="110" r="104" fill="none"
            stroke={CY + "0.2)"} strokeWidth="1" strokeDasharray="2 10" strokeLinecap="round" />
        </g>

        {/* Piste */}
        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />

        {/* Progression */}
        <circle cx="110" cy="110" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 110 110)"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dashoffset 0.6s ease" }} />

        {/* Repère de tête */}
        <circle cx="110" cy="110" r="3" fill={color} className="pulse-soft" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-hero text-[2.8rem] font-normal leading-none tabular-nums neon-text"
          style={{ color: "#eaf6ff" }}>
          {up}
        </span>
        <span className="text-[10px] tracking-[0.32em] uppercase mt-2" style={{ color: "var(--text-muted)" }}>
          en ligne / {total}
        </span>
      </div>
    </div>
  );
}
