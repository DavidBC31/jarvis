import type { CSSProperties } from "react";
import type { KeyStatus, ServiceState } from "../types";

// Palette ATLAS (charte Bleu Citron + design system)
export const C = {
  bg: "#060B1D",
  text: "#EEF0F2",
  blue: "#1450E2",
  blueDark: "#083a9d",
  teal: "#5ac8fa",
  ok: "#34c759",
  okText: "#7ee2a0",
  warn: "#ff9500",
  warnText: "#ffb763",
  ko: "#EC2026",
  koText: "#ff6b6f",
  pink: "#f9c1c2",
  muted45: "rgba(238,240,242,.45)",
  muted40: "rgba(238,240,242,.4)",
  muted35: "rgba(238,240,242,.35)",
  muted55: "rgba(238,240,242,.55)",
  muted5: "rgba(238,240,242,.5)",
};

// Règle charte : dans les chiffres en mono, le « 0 » devient « O ».
export function O(v: string | number): string {
  return String(v).replace(/0/g, "O");
}

// Panneau « verre » du design.
export function glass(bg = 0.04, border = 0.08): CSSProperties {
  return {
    background: `rgba(238,240,242,${bg})`,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: `1px solid rgba(238,240,242,${border})`,
    borderRadius: 16,
  };
}

export const MONO = "'Space Mono', ui-monospace, monospace";

// ── Statuts projets ───────────────────────────────────────────────────────────
export const PROJECT_DOT: Record<KeyStatus, string> = {
  on_track: C.ok, at_risk: C.warn, critical: C.ko, done: C.teal, paused: C.muted40,
};
export const PROJECT_LABEL: Record<KeyStatus, string> = {
  on_track: "EN COURS", at_risk: "À RISQUE", critical: "CRITIQUE", done: "TERMINÉ", paused: "EN PAUSE",
};

// ── Statuts services ──────────────────────────────────────────────────────────
export const SERVICE_DOT: Record<ServiceState, string> = {
  ok: C.ok, warn: C.warn, alert: C.ko, maint: C.teal,
};
export const SERVICE_LABEL: Record<ServiceState, string> = {
  ok: "OPÉRATIONNEL", warn: "SURVEILLANCE", alert: "HORS LIGNE", maint: "MAINTENANCE",
};

// ── Dates ─────────────────────────────────────────────────────────────────────
const JOURS = ["DIM.", "LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM."];
const MOIS  = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];
export const pad = (n: number) => String(n).padStart(2, "0");

export function clockStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function dateStr(d: Date): string {
  return `${JOURS[d.getDay()]} ${pad(d.getDate())} ${MOIS[d.getMonth()]}`;
}
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Échéance courte à partir d'une date ISO (ex. "15 SEPT.").
export function echeance(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())} ${MOIS[d.getMonth()]}`;
}
