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

// Violet dédié à la recette (aucun statut ne l'utilise : le signal reste unique).
const VIOLET = {
  dot: "#c084fc",
  bg: "rgba(168,85,247,.12)",
  bgHover: "rgba(168,85,247,.2)",
  border: "rgba(168,85,247,.5)",
  glow: "rgba(168,85,247,.25)",
  pill: "rgba(168,85,247,.18)",
};

// Couleur par catégorie — volontairement hors des teintes de statut
// (vert / orange / rouge) et du violet de recette, pour éviter toute confusion.
const TAG_COLOR: Record<string, string> = {
  "Logiciel Interne": "#8fa8ff",
  "Logiciel SaaS": C.teal,
  "Serveurs": C.pink,
  "Documentation": "rgba(238,240,242,.6)",
};
const tagColor = (t: string) => TAG_COLOR[t] ?? "rgba(238,240,242,.6)";

// Petite flèche d'évolution (▲ vert / ▼ orange) sur les projets récemment mis à jour.
function Trend({ change }: { change: NonNullable<Project["change"]> }) {
  const up = change.delta > 0;
  const color = up ? C.okText : C.warnText;
  const d = new Date(change.at);
  const quand = isNaN(d.getTime()) ? "" : ` · le ${d.toLocaleDateString("fr-FR")}`;
  return (
    <span title={`${change.from} % → ${change.to} %${quand}`}
      style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color, background: up ? "rgba(52,199,89,.12)" : "rgba(255,149,0,.12)", border: `1px solid ${up ? "rgba(52,199,89,.3)" : "rgba(255,149,0,.3)"}`, borderRadius: 9999, padding: "2px 7px", whiteSpace: "nowrap", justifySelf: "end" }}>
      {up ? "▲" : "▼"} {O(Math.abs(change.delta))}
    </span>
  );
}

// Rangée compacte (hauteur réduite d'environ 25 %).
function Row({ project: p, idx = 0 }: { project: Project; idx?: number }) {
  const done = p.keyStatus === "done";
  const recettage = !done && p.progress >= 100;
  const dot = recettage ? VIOLET.dot : PROJECT_DOT[p.keyStatus];
  const statutLabel = recettage ? "RECETTAGE" : PROJECT_LABEL[p.keyStatus];
  const idle = recettage ? VIOLET.bg : "rgba(238,240,242,.035)";
  const border = recettage ? VIOLET.border : "rgba(238,240,242,.07)";

  return (
    <div
      className={recettage ? "recette-wave" : undefined}
      style={{
        display: "grid", gridTemplateColumns: "minmax(0,1.5fr) 92px 1fr 54px 56px",
        alignItems: "center", gap: 14, borderRadius: 12, padding: "7px 18px", flexShrink: 0,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        backgroundColor: idle, border: `1px solid ${border}`,
        boxShadow: recettage ? `0 0 18px ${VIOLET.glow}` : undefined,
        // Décalage négatif : chaque ligne démarre à un endroit différent de
        // l'onde, qui cascade au lieu de clignoter en bloc.
        animationDelay: recettage ? `${(idx % 5) * -0.68}s` : undefined,
        transition: "background-color .25s, border-color .25s", opacity: done ? 0.75 : 1,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = recettage ? VIOLET.bgHover : "rgba(238,240,242,.06)"; e.currentTarget.style.borderColor = recettage ? VIOLET.dot : "rgba(90,200,250,.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idle; e.currentTarget.style.borderColor = border; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: dot, boxShadow: recettage ? `0 0 8px ${dot}` : undefined }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          {/* Hauteur figée : les lignes restent régulières même sans catégorie
              ni échéance. Le responsable n'est pas affiché (identique partout,
              il noyait l'information utile). */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, height: 16 }}>
            {p.tag && (
              <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase", color: tagColor(p.tag), border: `1px solid ${tagColor(p.tag)}44`, borderRadius: 4, padding: "1px 5px", flexShrink: 0, lineHeight: 1.4 }}>
                {p.tag}
              </span>
            )}
            {p.dueDate && (
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".08em", color: C.muted40, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {O(echeance(p.dueDate)).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", textAlign: "center", padding: "4px 0", borderRadius: 9999, border: `1px solid ${recettage ? VIOLET.dot : dot + "55"}`, color: dot, background: recettage ? VIOLET.pill : "transparent" }}>
        {statutLabel}
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "rgba(238,240,242,.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#1450E2,#5ac8fa)", animation: "barGrow 1s ease-out", width: `${p.progress}%` }} />
      </div>
      {p.change && p.change.delta !== 0 ? <Trend change={p.change} /> : <span />}
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
        {items.map((p, idx) => <Row key={p.id} project={p} idx={idx} />)}
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
