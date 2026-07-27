import { useDashboard } from "../../store";
import {
  C, O, glass, MONO, PROJECT_DOT, PROJECT_LABEL, echeance, isoWeek,
} from "../util";

function Kpi({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div style={{ ...glass(0.04, 0.08), padding: "20px 26px" }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: C.muted45, textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 46, fontWeight: 700, lineHeight: 1, color: color ?? C.text }}>
        {value}{unit && <span style={{ fontSize: 24, color: C.muted45 }}> {unit}</span>}
      </div>
    </div>
  );
}

export function Projets() {
  const panel = useDashboard((s) => s.state?.projects);
  const all = panel?.projects ?? [];

  const active = all.filter((p) => p.keyStatus !== "done" && p.keyStatus !== "paused");
  const blocages = all.filter((p) => p.keyStatus === "critical" || p.keyStatus === "at_risk").length;
  const avg = active.length
    ? Math.round(active.reduce((s, p) => s + (p.progress || 0), 0) / active.length)
    : 0;
  const now = new Date();

  return (
    <div style={{ position: "relative", zIndex: 4, padding: "24px 64px 0", animation: "riseIn .45s ease-out", height: "calc(100% - 96px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 42, fontWeight: 700, letterSpacing: "-.03em" }}>Projets IT en cours</h1>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".14em", color: C.muted5 }}>
          {O(active.length.toString().padStart(2, "0"))} ACTIFS · S{O(isoWeek(now))} — {O(now.getFullYear())}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Kpi label="Projets actifs" value={O(active.length.toString().padStart(2, "0"))} color={C.teal} />
        <Kpi label="Avancement moyen" value={O(avg)} unit="%" />
        <Kpi label="Blocages ouverts" value={O(blocages.toString().padStart(2, "0"))} color={blocages ? C.warn : C.text} />
      </div>

      {/* Liste sur 2 colonnes — deux fois plus de projets d'un coup d'œil */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 20, rowGap: 12, alignContent: "start", overflowY: "auto", paddingBottom: 18, flex: 1 }}>
        {active.length === 0 && (
          <div style={{ color: C.muted45, fontFamily: MONO, fontSize: 13, padding: "20px 4px", gridColumn: "1 / -1" }}>
            {panel ? "AUCUN PROJET ACTIF" : "CHARGEMENT…"}
          </div>
        )}
        {active.map((p) => {
          const dot = PROJECT_DOT[p.keyStatus];
          const isRecettage = p.keyStatus === "on_track" && p.progress === 100;
          const tagColor = isRecettage ? C.teal : dot;
          const tagLabel = isRecettage ? "RECETTAGE" : PROJECT_LABEL[p.keyStatus];
          return (
            <div key={p.id}
              style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) 104px 1fr 68px", alignItems: "center", gap: 18, ...glass(0.035, 0.07), padding: "14px 22px", transition: "all .25s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(238,240,242,.06)"; e.currentTarget.style.borderColor = "rgba(90,200,250,.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(238,240,242,.035)"; e.currentTarget.style.borderColor = "rgba(238,240,242,.07)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: dot }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".08em", color: C.muted40, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.owner} · {O(echeance(p.dueDate)).toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", textAlign: "center", padding: "5px 0", borderRadius: 9999, border: `1px solid ${tagColor}55`, color: tagColor, background: isRecettage ? "rgba(90,200,250,.1)" : "transparent" }}>
                {tagLabel}
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(238,240,242,.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#1450E2,#5ac8fa)", animation: "barGrow 1s ease-out", width: `${p.progress}%` }} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, textAlign: "right" }}>
                {O(p.progress)}<span style={{ fontSize: 11, color: C.muted40 }}> %</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
