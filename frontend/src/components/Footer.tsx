import { useEffect, useState } from "react";
import { useDashboard } from "../store";

function useLocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmt(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function Footer() {
  const footer = useDashboard((s) => s.state?.footer);
  const now    = useLocalClock();
  const gs     = footer?.globalStatus;
  const ok     = gs?.healthy ?? true;

  return (
    <footer className="shrink-0 flex items-center justify-between px-6 py-2.5 text-[11px]"
      style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: ok ? "var(--status-ok)" : "var(--status-alert)" }} />
        <span>
          Systèmes IT —{" "}
          <span style={{ color: ok ? "var(--status-ok)" : "var(--status-alert)" }}>
            {gs?.label ?? "…"}
          </span>
          {gs && <span className="ml-1.5 opacity-60">{gs.uptimePercent}% disponibilité</span>}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {footer && (
          <span className="opacity-60">
            Mac Studio · {footer.macStudio.temperatureC}°C · CPU {footer.macStudio.cpuLoadPercent}%
          </span>
        )}
        {footer?.activityStream[0] && (
          <span className="opacity-60 max-w-xs truncate">
            {footer.activityStream[0].label}
          </span>
        )}
        <span className="font-hero tabular-nums tracking-wide" style={{ color: "var(--neon-cyan)", opacity: 0.75 }}>
          {fmt(now)}
        </span>
      </div>
    </footer>
  );
}
