import { Logo } from "./Logo";
import { useDashboard } from "../store";

export type Tab = "ops" | "support" | "supervision";

const TABS: { id: Tab; label: string }[] = [
  { id: "ops",         label: "Opérations" },
  { id: "support",     label: "Support" },
  { id: "supervision", label: "Supervision" },
];

const STATUS_LABEL: Record<string, string> = {
  connecting:   "Connexion…",
  online:       "En ligne",
  reconnecting: "Reconnexion…",
};

interface HeaderProps {
  tab: Tab;
  onTab: (t: Tab) => void;
}

export function Header({ tab, onTab }: HeaderProps) {
  const connection = useDashboard((s) => s.connection);
  const online = connection === "online";

  return (
    <header className="flex items-center gap-8 px-6 py-3 shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

      {/* Marque */}
      <div className="flex items-center gap-3 shrink-0">
        <Logo />
        <div className="leading-tight">
          <div className="font-hero text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
            BLEU CITRON
          </div>
          <div className="text-[10px] tracking-[0.28em] uppercase" style={{ color: "var(--text-muted)" }}>
            IT Center
          </div>
        </div>
      </div>

      {/* Onglets */}
      <nav className="flex gap-1">
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-150"
              style={{
                color:      active ? "var(--neon-cyan)"   : "var(--text-muted)",
                background: active ? "rgba(56,189,248,0.10)" : "transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Statut + admin */}
      <div className="ml-auto flex items-center gap-5 text-[11px]">
        <a href="#admin" className="transition-colors hover:opacity-80"
          style={{ color: "var(--text-muted)" }}>
          Admin
        </a>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{
              background: online ? "var(--status-ok)" : "var(--status-warn)",
              boxShadow: `0 0 6px ${online ? "var(--status-ok)" : "var(--status-warn)"}`,
            }} />
          <span style={{ color: online ? "var(--status-ok)" : "var(--text-muted)" }}>
            {STATUS_LABEL[connection]}
          </span>
        </div>
      </div>
    </header>
  );
}
