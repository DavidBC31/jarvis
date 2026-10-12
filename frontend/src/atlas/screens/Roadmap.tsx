import { useDashboard } from "../../store";
import { C, O, glass, MONO } from "../util";
import type { RoadmapPanel, RoadmapBar } from "../../types";

// ── Repères temporels ─────────────────────────────────────────────────────────

const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const d = (iso: string) => new Date(iso + "T00:00:00");
const jour = (iso: string) => {
  const x = d(iso);
  return `${x.getDate()} ${MOIS_COURT[x.getMonth()]}`;
};

/** Mois couverts par la plage, avec leur position et largeur en %. */
function months(start: string, end: string) {
  const s = d(start), e = d(end);
  const span = e.getTime() - s.getTime();
  const out: { label: string; left: number; width: number }[] = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  while (cur <= e) {
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const from = Math.max(cur.getTime(), s.getTime());
    const to = Math.min(next.getTime(), e.getTime());
    out.push({
      label: `${MOIS_COURT[cur.getMonth()]} ${cur.getFullYear()}`,
      left: ((from - s.getTime()) / span) * 100,
      width: ((to - from) / span) * 100,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/** Empile les étiquettes sur plusieurs rangs quand les dates sont trop proches
 *  pour tenir côte à côte (ex. les ateliers des 20, 21 et 22 octobre). */
function stackRows(positions: number[], widthPct: number): number[] {
  const lastEnd: number[] = [];
  return positions.map((x) => {
    const start = x - widthPct / 2;
    let r = 0;
    while (r < lastEnd.length && lastEnd[r] > start + 0.15) r++;
    lastEnd[r] = x + widthPct / 2;
    return r;
  });
}

const VIOLET = "#c084fc";
const LANE_BG = "rgba(238,240,242,.028)";
const LANE_LABEL = 150;

export function Roadmap() {
  const panel = useDashboard((s) => s.state?.roadmap) as RoadmapPanel | undefined;

  if (!panel?.start || !panel.end) {
    return (
      <div style={{ position: "relative", zIndex: 4, padding: "24px 64px", color: C.muted45, fontFamily: MONO, fontSize: 13 }}>
        {panel ? "FEUILLE DE ROUTE INDISPONIBLE" : "CHARGEMENT…"}
      </div>
    );
  }

  const s = d(panel.start).getTime();
  const span = d(panel.end).getTime() - s;
  const x = (iso: string) => ((d(iso).getTime() - s) / span) * 100;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  // Garde l'étiquette dans le cadre quand le point est près d'un bord.
  const anchor = (v: number, w: number) => Math.max(w / 2, Math.min(100 - w / 2, v));

  const now = new Date();
  const today = new Date(now.toDateString()).getTime();
  const todayX = clamp(((now.getTime() - s) / span) * 100);
  const todayVisible = now.getTime() >= s && now.getTime() <= s + span;

  const next = [...(panel.milestones ?? [])]
    .filter((m) => d(m.date).getTime() >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const joursRestants = next ? Math.round((d(next.date).getTime() - today) / 86400000) : null;

  // `height` sert de hauteur minimale ET de poids : l'espace restant se répartit
  // au prorata du contenu, pour que la frise occupe toute la hauteur de l'écran.
  const Lane = ({ label, height, children }: { label: string; height: number; children: React.ReactNode }) => (
    <div style={{ display: "grid", gridTemplateColumns: `${LANE_LABEL}px 1fr`, gap: 16, flex: `${height} 0 ${height}px`, minHeight: height }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: C.muted45, paddingTop: 12, lineHeight: 1.4 }}>
        {label}
      </div>
      <div style={{ position: "relative", height: "100%", background: LANE_BG, borderRadius: 10 }}>{children}</div>
    </div>
  );

  const codir = panel.codir ?? [];
  const codirRows = stackRows(codir.map((c) => clamp(x(c.date))), 9.2);
  const meetings = panel.meetings ?? [];
  const meetRows = stackRows(meetings.map((m) => clamp(x(m.date))), 10);

  const CODIR_H = 26 + (Math.max(0, ...codirRows) + 1) * 30;
  const MEET_H = 26 + (Math.max(0, ...meetRows) + 1) * 36;

  return (
    <div style={{ position: "relative", zIndex: 4, padding: "20px 48px 0", animation: "riseIn .45s ease-out", height: "calc(100% - 96px - 42px)", display: "flex", flexDirection: "column" }}>

      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1, fontWeight: 700, letterSpacing: "-.03em" }}>{panel.title}</h1>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", color: C.muted5, marginTop: 8, textTransform: "uppercase" }}>
            {panel.subtitle} · {O(jour(panel.start))} → {O(jour(panel.end))}
            {panel.stale && <span style={{ color: C.warnText, marginLeft: 14 }}>▲ DONNÉES FIGÉES</span>}
          </div>
        </div>
        {next && (
          <div style={{ ...glass(0.04, 0.08), borderRadius: 14, padding: "9px 20px", textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".16em", color: C.muted45, textTransform: "uppercase", marginBottom: 3 }}>
              Prochain jalon · {next.id}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, lineHeight: 1.1, color: C.teal }}>
              {O(jour(next.date))}
              <span style={{ fontSize: 12.5, color: C.muted45 }}>
                {joursRestants === 0 ? "  aujourd'hui" : `  J−${O(joursRestants ?? 0)}`}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "rgba(238,240,242,.8)", marginTop: 2 }}>{next.label}</div>
          </div>
        )}
      </div>

      {/* Frise */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 9 }}>

        {/* Mois + congés */}
        <div style={{ display: "grid", gridTemplateColumns: `${LANE_LABEL}px 1fr`, gap: 16 }}>
          <span />
          <div style={{ position: "relative", height: 32 }}>
            {months(panel.start, panel.end).map((m) => (
              <div key={m.label} style={{ position: "absolute", left: `${m.left}%`, width: `${m.width}%`, top: 0, borderLeft: "1px solid rgba(238,240,242,.12)", paddingLeft: 9 }}>
                <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(238,240,242,.75)" }}>{m.label}</span>
              </div>
            ))}
            {(panel.periods ?? []).map((p) => (
              <div key={p.label} style={{ position: "absolute", left: `${clamp(x(p.start))}%`, width: `${clamp(x(p.end)) - clamp(x(p.start))}%`, top: 18, height: 13, background: "rgba(238,240,242,.07)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted45 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Jalons — étiquettes alternées de part et d'autre de l'axe */}
        <Lane label="Jalons" height={118}>
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(90,200,250,.3)" }} />
          {(panel.milestones ?? []).map((m, i) => {
            const passe = d(m.date).getTime() < today;
            const col = passe ? "rgba(238,240,242,.45)" : C.teal;
            const px = clamp(x(m.date));
            const haut = i % 2 === 0;
            // Tout est ancré sur l'axe central : la piste peut grandir sans que
            // les étiquettes s'éloignent de leur losange.
            const place = haut ? { bottom: "50%", marginBottom: 13 } : { top: "50%", marginTop: 13 };
            return (
              <div key={m.id}>
                <div style={{ position: "absolute", left: `${px}%`, top: "50%", width: 13, height: 13, marginLeft: -6.5, marginTop: -6.5, background: col, transform: "rotate(45deg)", boxShadow: passe ? "none" : `0 0 10px ${col}` }} />
                <div style={{ position: "absolute", left: `${anchor(px, 11)}%`, width: 180, marginLeft: -90, textAlign: "center", ...place }}>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: col, letterSpacing: ".06em" }}>
                    {m.id} · {O(jour(m.date))}
                  </div>
                  <div style={{ fontSize: 12.5, color: passe ? C.muted45 : "rgba(238,240,242,.9)", lineHeight: 1.25 }}>{m.label}</div>
                </div>
              </div>
            );
          })}
        </Lane>

        {/* Codir — étiquettes empilées sous l'axe */}
        <Lane label="Codir · Codir SI" height={CODIR_H}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 15, height: 1, background: "rgba(238,240,242,.14)" }} />
          {codir.map((c, i) => {
            const si = c.kind === "si";
            const col = c.done ? "rgba(238,240,242,.35)" : si ? "#8fa8ff" : "rgba(238,240,242,.9)";
            const px = clamp(x(c.date));
            return (
              <div key={`${c.date}-${c.label}`}>
                <div style={{ position: "absolute", left: `${px}%`, top: 11, width: 9, height: 9, marginLeft: -4.5, borderRadius: "50%", background: si ? "transparent" : col, border: `1.5px solid ${col}` }} />
                <div style={{ position: "absolute", left: `${anchor(px, 9.2)}%`, width: 152, marginLeft: -76, top: 24 + codirRows[i] * 30, textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted45, letterSpacing: ".06em" }}>{O(jour(c.date))}</div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.2, color: c.strong ? C.teal : "rgba(238,240,242,.78)", fontWeight: c.strong ? 700 : 400 }}>{c.label}</div>
                </div>
              </div>
            );
          })}
        </Lane>

        {/* Ateliers — étiquettes empilées sous l'axe */}
        <Lane label="Ateliers et rencontres" height={MEET_H}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 15, height: 1, background: "rgba(238,240,242,.14)" }} />
          {meetings.map((m, i) => {
            const pose = m.status === "booked";
            const col = pose ? "#8fa8ff" : "rgba(238,240,242,.65)";
            const px = clamp(x(m.date));
            return (
              <div key={`${m.date}-${m.label}`}>
                <div style={{ position: "absolute", left: `${px}%`, top: 11, width: 9, height: 9, marginLeft: -4.5, borderRadius: 2, background: pose ? col : "transparent", border: `1.5px solid ${col}` }} />
                <div style={{ position: "absolute", left: `${anchor(px, 10)}%`, width: 166, marginLeft: -83, top: 24 + meetRows[i] * 36, textAlign: "center" }}>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.muted45, letterSpacing: ".06em" }}>{O(jour(m.date))}</div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.2, color: "rgba(238,240,242,.85)" }}>{m.label}</div>
                  {m.detail && <div style={{ fontFamily: MONO, fontSize: 8.5, color: C.muted40, lineHeight: 1.2 }}>{m.detail}</div>}
                </div>
              </div>
            );
          })}
        </Lane>

        {/* Construction */}
        <Lane label={`Construction${panel.construction?.owners ? ` · ${panel.construction.owners}` : ""}`} height={76}>
          {(panel.construction?.bars ?? []).map((b: RoadmapBar) => {
            const left = clamp(x(b.start));
            const width = Math.max(1.2, clamp(x(b.end)) - left);
            const tone = b.tone ?? "solid";
            const style =
              tone === "solid" ? { background: "#1450E2", color: "#fff", border: "1px solid #1450E2" }
              : tone === "light" ? { background: "rgba(90,200,250,.3)", color: "#eaf6ff", border: "1px solid rgba(90,200,250,.45)" }
              : tone === "muted" ? { background: "rgba(238,240,242,.1)", color: C.muted45, border: "1px solid rgba(238,240,242,.14)" }
              : { background: "transparent", color: C.teal, border: `1px solid ${C.teal}` };
            return (
              <div key={`${b.label}-${b.start}`} title={`${b.label}${b.detail ? ` — ${b.detail}` : ""}`}
                style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: (b.row ?? 0) === 0 ? 10 : 42, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", overflow: "hidden", ...style }}>
                <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</span>
              </div>
            );
          })}
        </Lane>

        {/* Repères verticaux — étiquettes en bas, pour ne rien recouvrir */}
        <div style={{ position: "absolute", left: LANE_LABEL + 16, right: 0, top: 41, bottom: 0, pointerEvents: "none" }}>
          {todayVisible && (
            <div style={{ position: "absolute", left: `${todayX}%`, top: 0, bottom: 0, width: 1, background: C.teal, boxShadow: `0 0 8px ${C.teal}` }}>
              <span style={{ position: "absolute", bottom: -2, left: 6, fontFamily: MONO, fontSize: 9, letterSpacing: ".14em", color: C.teal, whiteSpace: "nowrap" }}>AUJOURD'HUI</span>
            </div>
          )}
          {panel.goLive && (
            <div style={{ position: "absolute", left: `${clamp(x(panel.goLive.date))}%`, top: 0, bottom: 0, width: 0, borderLeft: `2px dashed ${VIOLET}` }}>
              <span style={{ position: "absolute", bottom: -2, right: 6, fontFamily: MONO, fontSize: 9, letterSpacing: ".14em", color: VIOLET, whiteSpace: "nowrap" }}>
                {panel.goLive.label.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Légende */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "12px 0 12px", fontFamily: MONO, fontSize: 9.5, letterSpacing: ".1em", color: C.muted45, textTransform: "uppercase", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, background: C.teal, transform: "rotate(45deg)", display: "inline-block" }} /> Jalon</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(238,240,242,.9)", display: "inline-block" }} /> Codir lundi</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #8fa8ff", display: "inline-block" }} /> Codir SI mercredi</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, background: "#8fa8ff", borderRadius: 2, display: "inline-block" }} /> RDV posé</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, border: "1.5px solid rgba(238,240,242,.65)", borderRadius: 2, display: "inline-block" }} /> RDV à caler</span>
        {(panel.unscheduled ?? []).length > 0 && (
          <span style={{ marginLeft: "auto", color: C.warnText, textTransform: "none", letterSpacing: ".04em" }}>
            À caler : {(panel.unscheduled ?? []).map((u) => u.label).join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}
