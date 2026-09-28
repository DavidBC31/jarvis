import { useDashboard } from "../../store";
import type { Project } from "../../types";
import {
  C, O, glass, MONO, PROJECT_DOT, PROJECT_LABEL, echeance, isoWeek,
} from "../util";

// KPI compact, aligné sur la ligne du titre pour laisser la hauteur aux listes.
function Kpi({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div style={{ ...glass(0.04, 0.08), borderRadius: 14, padding: "10px 22px", minWidth: 190 }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".16em", color: C.muted45, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, lineHeight: 1, color: color ?? C.text }}>
        {value}{unit && <span style={{ fontSize: 16, color: C.muted45 }}> {unit}</span>}
      </div>
    </div>
  );
}

// Projet terminé (statut) ou arrivé à 100 % (en recettage) → colonne de droite.
const isFinished = (p: Project) => p.keyStatus === "done" || p.progress >= 100;

// Rangée compacte (hauteur réduite d'environ 25 %).
function Row({ project: p }: { project: Project }) {
  const done = p.keyStatus === "done";
  const recettage = !done && p.progress >= 100;
  const dot = recettage ? C.teal : PROJECT_DOT[p.keyStatus];
  const tagLabel = recettage ? "RECETTAGE" : PROJECT_LABEL[p.keyStatus];

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) 92px 1fr 56px", alignItems: "center", gap: 14, ...glass(0.035, 0.07), borderRadius: 12, padding: "7px 18px", flexShrink: 0, transition: "all .25s", opacity: done ? 0.75 : 1 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(238,240,242,.06)"; e.currentTarget.style.borderColor = "rgba(90,200,250,.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(238,240,242,.035)"; e.currentTarget.style.borderColor = "rgba(238,240,242,.07)"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: dot }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, lineHeight: 1.3, letterSpacing: ".08em", color: C.muted40, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.owner} · {O(echeance(p.dueDate)).toUpperCase()}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", textAlign: "center", padding: "4px 0", borderRadius: 9999, border: `1px solid ${dot}55`, color: dot, background: recettage ? "rgba(90,200,250,.1)" : "transparent" }}>
        {tagLabel}
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "rgba(238,240,242,.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#1450E2,#5ac8fa)", animation: "barGrow 1s ease-out", width: `${p.progress}%` }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, textAlign: "right" }}>
        {O(p.progress)}<span style={{ fontSize: 10, color: C.muted40 }}> %</span>
      </div>
    </div>
  );
}

function Column({ title, items, empty }: { title: string; items: Project[]; empty: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: C.muted45, textTransform: "uppercase" }}>{title}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.teal }}>{O(String(items.length).padStart(2, "0"))}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(238,240,242,.07)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "thin", paddingBottom: 4 }}>
        {items.length === 0 && (
          <div style={{ color: C.muted40, fontFamily: MONO, fontSize: 12, padding: "12px 4px" }}>{empty}</div>
        )}
        {items.map((p) => <Row key={p.id} project={p} />)}
      </div>
    </div>
  );
}

export function Projets() {
  const panel = useDashboard((s) => s.state?.projects);
  const all = panel?.projects ?? [];

  // Les projets en pause ne sont ni « en cours » ni terminés : ils restent hors écran.
  const enCours = all.filter((p) => p.keyStatus !== "paused" && !isFinished(p));
  const finis = all
    .filter((p) => p.keyStatus !== "paused" && isFinished(p))
    .sort((a, b) => Number(a.keyStatus === "done") - Number(b.keyStatus === "done")); // recettage d'abord

  const blocages = enCours.filter((p) => p.keyStatus === "critical" || p.keyStatus === "at_risk").length;
  const avg = enCours.length
    ? Math.round(enCours.reduce((s, p) => s + (p.progress || 0), 0) / enCours.length)
    : 0;
  const now = new Date();
  const loading = panel ? "" : "CHARGEMENT…";

  return (
    <div style={{ position: "relative", zIndex: 4, padding: "24px 64px 0", animation: "riseIn .45s ease-out", height: "calc(100% - 96px - 42px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1, fontWeight: 700, letterSpacing: "-.03em" }}>Projets IT</h1>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".14em", color: C.muted5, marginTop: 10 }}>
            S{O(isoWeek(now))} — {O(now.getFullYear())} · {O(String(finis.length).padStart(2, "0"))} TERMINÉS / RECETTAGE
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <Kpi label="En cours" value={O(String(enCours.length).padStart(2, "0"))} color={C.teal} />
          <Kpi label="Avancement moyen" value={O(avg)} unit="%" />
          <Kpi label="Blocages ouverts" value={O(String(blocages).padStart(2, "0"))} color={blocages ? C.warn : C.text} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "minmax(0,1fr)", columnGap: 28, flex: 1, minHeight: 0 }}>
        <Column title="En cours" items={enCours} empty={loading || "AUCUN PROJET EN COURS"} />
        <Column title="Terminés & recettage" items={finis} empty={loading || "AUCUN PROJET TERMINÉ"} />
      </div>
    </div>
  );
}
