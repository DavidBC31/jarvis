import { Logo } from "./Logo";
import { useDashboard } from "../store";

export type Tab = "ops" | "supervision";

const TABS: { id: Tab; label: string }[] = [
  { id: "ops",         label: "OPÉRATIONS" },
  { id: "supervision", label: "SUPERVISION" },
];

const STATUS_LABEL: Record<string, string> = {
  connecting:   "CONNEXION…",
  online:       "EN LIGNE",
  reconnecting: "RECONNEXION…",
};

interface HeaderProps {
  tab: Tab;
  onTab: (t: Tab) => void;
}

export function Header({ tab, onTab }: HeaderProps) {
  const connection = useDashboard((s) => s.connection);
  return (
    <header
      className="flex items-center gap-6 px-4 py-2 shrink-0 border-b"
      style={{ borderColor: "var(--neon-cyan-dim)" }}
    >
      {/* Logo + nom */}
      <div className="flex items-center gap-3 shrink-0">
        <Logo />
        <div className="leading-tight">
          <div className="font-display text-xl tracking-[0.3em] neon-text">BLEU CITRON</div>
          <div className="font-display text-[10px] tracking-[0.5em] text-text-muted">IT CENTER</div>
        </div>
      </div>

      {/* Onglets */}
      <nav className="flex gap-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className="px-4 py-1.5 text-[11px] font-display tracking-[0.2em] rounded-sm transition-colors"
              style={{
                color: active ? "var(--neon-cyan)" : "var(--text-muted)",
                background: active ? "rgba(0,229,255,0.07)" : "transparent",
                borderBottom: active
                  ? "2px solid var(--neon-cyan)"
                  : "2px solid transparent",
                boxShadow: active ? "0 0 10px rgba(0,229,255,0.15)" : "none",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Statut + admin */}
      <div className="ml-auto flex items-center gap-4 text-[10px] tracking-widest">
        <a href="#admin" className="text-text-muted hover:text-white transition-colors">
          ADMIN
        </a>
        <span
          style={{
            color: connection === "online" ? "var(--status-ok)" : "var(--status-warn)",
          }}
        >
          ● {STATUS_LABEL[connection]}
        </span>
      </div>
    </header>
  );
}
