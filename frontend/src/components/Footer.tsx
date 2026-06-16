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
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Footer() {
  const footer = useDashboard((s) => s.state?.footer);
  const now = useLocalClock();
  const gs = footer?.globalStatus;
  const healthy = gs?.healthy ?? true;

  return (
    <footer className="neon-border rounded-md px-4 py-1.5 flex items-center justify-between text-[11px] gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: healthy ? "var(--status-ok)" : "var(--status-alert)" }}
        />
        <span className="font-display tracking-widest truncate">
          BLEU CITRON IT SYSTEMS: {gs?.label ?? "…"}
          {gs && ` [${gs.uptimePercent}% UPTIME]`}
        </span>
      </div>

      <div className="flex items-center gap-5 shrink-0">
        {footer && (
          <span className="text-text-muted">
            MAC STUDIO · {footer.macStudio.temperatureC}°C · CPU{" "}
            {footer.macStudio.cpuLoadPercent}%
          </span>
        )}
        <span className="text-text-muted truncate max-w-[16rem]">
          ⟳ {footer?.activityStream[0]?.label ?? "—"}
        </span>
        <span className="font-display tracking-widest neon-text tabular-nums">
          {fmt(now)}
        </span>
      </div>
    </footer>
  );
}
