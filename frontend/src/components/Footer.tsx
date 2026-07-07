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
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function Footer() {
  const footer = useDashboard((s) => s.state?.footer);
  const now = useLocalClock();
  const gs = footer?.globalStatus;
  const healthy = gs?.healthy ?? true;

  return (
    <footer
      className="shrink-0 rounded-xl px-5 py-2 flex items-center justify-between text-[11px] gap-4"
      style={{
        background: "rgba(13,9,38,0.7)",
        border: "1px solid rgba(139,92,246,0.15)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: healthy ? "var(--status-ok)" : "var(--status-alert)",
            boxShadow: `0 0 6px ${healthy ? "var(--status-ok)" : "var(--status-alert)"}`,
          }}
        />
        <span className="font-display tracking-widest truncate text-text-muted">
          SYSTÈMES IT BLEU CITRON :{" "}
          <span style={{ color: healthy ? "var(--status-ok)" : "var(--status-alert)" }}>
            {gs?.label ?? "—"}
          </span>
          {gs && (
            <span className="text-text-muted"> · {gs.uptimePercent} % DISPO</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-5 shrink-0 text-text-muted">
        {footer && (
          <span>
            MAC STUDIO · {footer.macStudio.temperatureC}°C · CPU {footer.macStudio.cpuLoadPercent}%
          </span>
        )}
        <span className="truncate max-w-[18rem]">
          ⟳ {footer?.activityStream[0]?.label ?? "—"}
        </span>
        <span
          className="font-display tracking-widest tabular-nums"
          style={{ color: "var(--neon-cyan)" }}
        >
          {fmt(now)}
        </span>
      </div>
    </footer>
  );
}
