// Logo : citron géométrique bleu avec orbitales d'électrons animées.
// PLACEHOLDER géométrique — à affiner sur la maquette image_3.png.
export function Logo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Bleu Citron"
      style={{ filter: "drop-shadow(0 0 6px var(--neon-cyan))" }}
    >
      <defs>
        <linearGradient id="lemon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fe9ff" />
          <stop offset="100%" stopColor="#0a3a55" />
        </linearGradient>
      </defs>

      {/* Citron facetté */}
      <g stroke="var(--neon-cyan)" strokeWidth="1.2">
        <polygon points="50,28 68,42 60,66 40,66 32,42" fill="url(#lemon)" />
        <line x1="50" y1="28" x2="50" y2="66" opacity="0.5" />
        <line x1="32" y1="42" x2="68" y2="42" opacity="0.5" />
      </g>

      {/* Orbitales d'électrons */}
      <g fill="none" stroke="var(--neon-cyan)" strokeWidth="1" opacity="0.7">
        <g style={{ transformOrigin: "50px 50px", animation: "orbit 8s linear infinite" }}>
          <ellipse cx="50" cy="50" rx="44" ry="16" />
          <circle cx="94" cy="50" r="2.5" fill="var(--neon-cyan)" stroke="none" />
        </g>
        <g
          style={{
            transformOrigin: "50px 50px",
            transform: "rotate(60deg)",
            animation: "orbit 11s linear infinite reverse",
          }}
        >
          <ellipse cx="50" cy="50" rx="44" ry="16" />
          <circle cx="6" cy="50" r="2.5" fill="var(--neon-cyan)" stroke="none" />
        </g>
      </g>
    </svg>
  );
}
