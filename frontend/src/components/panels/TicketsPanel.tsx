import { useDashboard } from "../../store";
import type { Ticket, TicketStatus, TicketPriority } from "../../types";

// ── Palettes ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<TicketStatus, string> = {
  new: "var(--status-new)",
  in_progress: "var(--status-warn)",
  on_hold: "var(--status-alert)",
  resolved: "var(--status-ok)",
  closed: "var(--text-muted)",
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  on_hold: "En attente",
  resolved: "Résolu",
  closed: "Clôturé",
};
const PRIORITY: Record<TicketPriority, { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "#f87171" },
  high:   { label: "Haute",   color: "#fbbf24" },
  medium: { label: "Moyenne", color: "var(--text-muted)" },
  low:    { label: "Basse",   color: "var(--text-muted)" },
};

// Couleur brute (hex) par statut pour le donut SVG.
const STATUS_HEX: Record<TicketStatus, string> = {
  new: "#60a5fa", in_progress: "#fbbf24", on_hold: "#f87171", resolved: "#34d399", closed: "#55607a",
};
const STATUS_ORDER: TicketStatus[] = ["new", "in_progress", "on_hold", "resolved", "closed"];

// ── Donut par statut (rail gauche) ────────────────────────────────────────────

function Donut({ counts, total }: { counts: Partial<Record<TicketStatus, number>>; total: number }) {
  const R = 84, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = STATUS_ORDER
    .map(s => ({ s, n: counts[s] ?? 0 }))
    .filter(x => x.n > 0)
    .map(({ s, n }) => {
      const frac = total ? n / total : 0;
      const seg = { s, dash: frac * C, offset: -acc * C };
      acc += frac;
      return seg;
    });

  return (
    <div className="relative w-full mx-auto float-soft" style={{ maxWidth: 260 }}>
      <svg viewBox="0 0 220 220" className="w-full h-auto block" aria-hidden>
        <defs>
          <radialGradient id="ticketGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.2)" />
            <stop offset="60%" stopColor="rgba(56,189,248,0.05)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </radialGradient>
        </defs>

        <circle cx="110" cy="110" r="100" fill="url(#ticketGlow)" />
        <g className="spin-c-60">
          <circle cx="110" cy="110" r="104" fill="none"
            stroke="rgba(56,189,248,0.2)" strokeWidth="1" strokeDasharray="2 10" strokeLinecap="round" />
        </g>
        <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        {segs.map(seg => (
          <circle key={seg.s} cx="110" cy="110" r={R} fill="none"
            stroke={STATUS_HEX[seg.s]} strokeWidth="7" strokeLinecap="butt"
            strokeDasharray={`${seg.dash} ${C - seg.dash}`} strokeDashoffset={seg.offset}
            transform="rotate(-90 110 110)"
            style={{ filter: `drop-shadow(0 0 4px ${STATUS_HEX[seg.s]}70)`, transition: "stroke-dasharray 0.6s ease" }} />
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-hero text-[2.8rem] font-normal leading-none tabular-nums neon-text"
          style={{ color: "#eaf6ff" }}>
          {total}
        </span>
        <span className="text-[10px] tracking-[0.32em] uppercase mt-2" style={{ color: "var(--text-muted)" }}>
          tickets
        </span>
      </div>
    </div>
  );
}

// ── Ligne ticket — le SUJET est la vedette ────────────────────────────────────

function Row({ ticket: t }: { ticket: Ticket }) {
  const color = STATUS_COLOR[t.status];
  const prio = PRIORITY[t.priority] ?? PRIORITY.medium;
  const closed = t.status === "resolved" || t.status === "closed";

  return (
    <div
      className="grid items-center gap-6 px-4 rounded-xl transition-colors duration-150"
      style={{ gridTemplateColumns: "minmax(0,1fr) 8rem 6rem", minHeight: 54, opacity: closed ? 0.6 : 1 }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.035)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Sujet + réf/assigné */}
      <div className="min-w-0 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color, boxShadow: closed ? "none" : `0 0 6px ${color}` }} />
        <div className="min-w-0">
          <div className="truncate text-[18px] font-medium leading-tight"
            style={{ color: "var(--text-primary)" }} title={t.subject}>
            {t.subject}
          </div>
          <div className="truncate text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
            <span className="font-mono tracking-wider">{t.id}</span>
            {t.assignedTo ? ` · ${t.assignedTo}` : " · non assigné"}
          </div>
        </div>
      </div>

      {/* Statut */}
      <span className="text-[11px] px-2.5 py-1 rounded-lg text-center whitespace-nowrap"
        style={{ color, background: `${color}14` }}>
        {STATUS_LABEL[t.status]}
      </span>

      {/* Priorité */}
      <div className="flex items-center justify-end gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: prio.color }} />
        <span className="text-[12px]" style={{ color: prio.color }}>{prio.label}</span>
      </div>
    </div>
  );
}

// ── Section + KPI ─────────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)", opacity: 0.5 }}>{count}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

function KpiRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-3xl font-extralight tabular-nums leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Panneau ───────────────────────────────────────────────────────────────────

export function TicketsPanel() {
  const panel = useDashboard((s) => s.state?.tickets);
  const tickets = panel?.tickets ?? [];
  const counts = panel?.statusCounts ?? {};
  const total = panel?.total ?? tickets.length;

  const nb = (s: TicketStatus) => counts[s] ?? 0;
  const open = nb("new") + nb("in_progress") + nb("on_hold");

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Rail donut gauche ── */}
      <aside className="shrink-0 flex flex-col justify-between px-9 py-9"
        style={{ width: 360, borderRight: "1px solid rgba(255,255,255,0.05)" }}>

        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase mb-2" style={{ color: "var(--text-muted)" }}>
            Système d'information
          </p>
          <h1 className="text-2xl font-light tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
            Tickets <span style={{ color: "var(--neon-cyan)" }}>Everping</span>
          </h1>
        </div>

        <div className="py-4">
          <Donut counts={counts} total={total} />
        </div>

        <div className="space-y-4">
          <KpiRow label="Nouveaux"  value={nb("new")}         color={nb("new") ? "var(--status-new)" : "var(--text-muted)"} />
          <KpiRow label="En cours"  value={nb("in_progress")} color={nb("in_progress") ? "var(--status-warn)" : "var(--text-muted)"} />
          <KpiRow label="En attente" value={nb("on_hold")}    color={nb("on_hold") ? "var(--status-alert)" : "var(--text-muted)"} />
          <KpiRow label="Résolus"   value={nb("resolved") + nb("closed")} color={(nb("resolved") + nb("closed")) ? "var(--status-ok)" : "var(--text-muted)"} />
          {panel?.source === "sample" && (
            <p className="text-[10px] tracking-widest pt-1" style={{ color: "var(--status-warn)" }}>
              données d'exemple — Everping non connecté
            </p>
          )}
          {panel?.stale && (
            <p className="text-[10px] tracking-widest pt-1" style={{ color: "var(--status-warn)" }}>
              données obsolètes — source injoignable
            </p>
          )}
        </div>
      </aside>

      {/* ── Liste des tickets ── */}
      <div className="flex-1 min-h-0 overflow-auto px-8 py-8 animate-fade-in">
        <SectionLabel label={`Tickets ouverts · ${open}`} count={total} />

        {!panel ? (
          <p className="py-10 text-sm" style={{ color: "var(--text-muted)" }}>Chargement…</p>
        ) : total === 0 ? (
          <p className="py-10 text-sm" style={{ color: "var(--text-muted)" }}>Aucun ticket à afficher.</p>
        ) : (
          <div className="flex flex-col">
            {tickets.map(t => <Row key={t.id} ticket={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
