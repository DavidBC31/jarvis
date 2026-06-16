import { Logo } from "./Logo";
import { useDashboard } from "../store";

const STATUS_LABEL: Record<string, string> = {
  connecting: "CONNECTING…",
  online: "ONLINE",
  reconnecting: "RECONNECTING…",
};

export function Header() {
  const connection = useDashboard((s) => s.connection);
  return (
    <header className="flex items-center justify-center relative py-2">
      <div className="flex items-center gap-4">
        <Logo />
        <div className="text-center leading-tight">
          <div className="font-display text-2xl tracking-[0.3em] neon-text">
            BLEU CITRON
          </div>
          <div className="font-display text-xs tracking-[0.5em] text-text-muted">
            IT CENTER · JARVIS
          </div>
        </div>
      </div>
      <div
        className="absolute right-4 top-3 flex items-center gap-3 text-[10px] tracking-widest"
      >
        <a href="#admin" className="text-neon-cyan opacity-70 hover:opacity-100">
          ADMIN
        </a>
        <span style={{ color: connection === "online" ? "var(--status-ok)" : "var(--status-warn)" }}>
          ● {STATUS_LABEL[connection]}
        </span>
      </div>
    </header>
  );
}
