// Élément graphique héro : sphère orbitale animée façon hologramme.
// Le total des projets s'affiche en son centre. Pur SVG + CSS, aucune dépendance.

const CY = "rgba(56,189,248,";

export function OrbitSphere({ count }: { count: number }) {
  return (
    <div className="relative w-full mx-auto float-soft" style={{ maxWidth: 300 }}>
      <svg viewBox="0 0 320 320" className="w-full h-auto block" aria-hidden>
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor={CY + "0.28)"} />
            <stop offset="55%" stopColor={CY + "0.06)"} />
            <stop offset="100%" stopColor={CY + "0)"} />
          </radialGradient>
          <filter id="nodeGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>

        {/* Lueur centrale */}
        <circle cx="160" cy="160" r="150" fill="url(#coreGlow)" />

        {/* Globe : latitudes */}
        <g fill="none" stroke={CY + "0.16)"} strokeWidth="1">
          <ellipse cx="160" cy="160" rx="100" ry="24" />
          <ellipse cx="160" cy="160" rx="100" ry="55" />
          <ellipse cx="160" cy="160" rx="100" ry="82" />
        </g>
        {/* Globe : méridiens */}
        <g fill="none" stroke={CY + "0.12)"} strokeWidth="1">
          <ellipse cx="160" cy="160" rx="24" ry="100" />
          <ellipse cx="160" cy="160" rx="55" ry="100" />
          <ellipse cx="160" cy="160" rx="82" ry="100" />
        </g>
        {/* Cercle de base */}
        <circle cx="160" cy="160" r="100" fill="none" stroke={CY + "0.3)"} strokeWidth="1.25" />

        {/* Anneau pointillé extérieur (lent) */}
        <g className="spin-60">
          <circle cx="160" cy="160" r="128" fill="none"
            stroke={CY + "0.22)"} strokeWidth="1" strokeDasharray="2 10" strokeLinecap="round" />
        </g>

        {/* Orbite A */}
        <g className="spin-40">
          <g transform="rotate(-20 160 160)">
            <ellipse cx="160" cy="160" rx="122" ry="40" fill="none"
              stroke={CY + "0.34)"} strokeWidth="1.25" />
            <circle cx="282" cy="160" r="6" fill="#38bdf8" filter="url(#nodeGlow)" />
            <circle cx="282" cy="160" r="3" fill="#bae6fd" />
          </g>
        </g>

        {/* Orbite B */}
        <g className="spin-28-rev">
          <g transform="rotate(32 160 160)">
            <ellipse cx="160" cy="160" rx="118" ry="56" fill="none"
              stroke={CY + "0.28)"} strokeWidth="1.25" />
            <circle cx="42" cy="160" r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
            <circle cx="42" cy="160" r="2.5" fill="#e0f2fe" />
          </g>
        </g>

        {/* Cœur pulsé */}
        <circle cx="160" cy="160" r="4" fill="#38bdf8" filter="url(#nodeGlow)" className="pulse-soft" />
      </svg>

      {/* Total au centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-hero text-[3rem] font-normal leading-none tabular-nums neon-text"
          style={{ color: "#eaf6ff" }}>
          {count}
        </span>
        <span className="text-[10px] tracking-[0.4em] uppercase mt-2" style={{ color: "var(--text-muted)" }}>
          projets
        </span>
      </div>
    </div>
  );
}
