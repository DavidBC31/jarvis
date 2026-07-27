import { useDashboard } from "../../store";
import { C, O, glass, MONO, SERVICE_DOT, SERVICE_LABEL } from "../util";
import type { ServiceNode } from "../../types";

export function Systemes({ onIncident }: { onIncident: () => void }) {
  const panel = useDashboard((s) => s.state?.services);
  const services: ServiceNode[] = panel?.nodes ?? [];

  // Disponibilité moyenne sur l'ensemble des services supervisés.
  const withUptime = services.filter((s) => typeof s.uptimePercent === "number");
  const availability = withUptime.length
    ? withUptime.reduce((s, n) => s + (n.uptimePercent ?? 0), 0) / withUptime.length
    : panel?.total
      ? (panel.upCount ?? 0) / panel.total * 100
      : 100;
  const availStr = O(availability.toFixed(2).replace(".", ","));

  // Alertes = services non-OK (les plus dégradés d'abord).
  const alerts = services
    .filter((s) => s.state !== "ok")
    .slice(0, 3);

  return (
    <div style={{ position: "relative", zIndex: 4, padding: "28px 64px 0", animation: "riseIn .45s ease-out", height: "calc(100% - 96px)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 42, fontWeight: 700, letterSpacing: "-.03em" }}>Veille systèmes</h1>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".14em", color: C.muted5 }}>SCAN CONTINU · 3O S</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, height: "calc(100% - 90px)" }}>
        {/* Colonne gauche */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: 0 }}>
          <div style={{ ...glass(0.04, 0.08), padding: 32 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: C.muted45, textTransform: "uppercase", marginBottom: 14 }}>Disponibilité — services</div>
            <div style={{ fontFamily: MONO, fontSize: 74, fontWeight: 700, lineHeight: 1, color: C.teal }}>
              {availStr}<span style={{ fontSize: 30, color: C.muted40 }}> %</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted40, marginTop: 12, letterSpacing: ".08em" }}>
              {O(panel?.upCount ?? 0)} / {O(panel?.total ?? services.length)} SERVICES EN LIGNE
            </div>
          </div>

          <div style={{ ...glass(0.04, 0.08), padding: "28px 32px", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: C.muted45, textTransform: "uppercase", marginBottom: 18 }}>Dernières alertes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {alerts.length === 0 && (
                <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted35 }}>—</span>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>Aucune alerte active</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", color: C.okText }}>TOUT EST NOMINAL</div>
                  </div>
                </div>
              )}
              {alerts.map((a: ServiceNode) => (
                <div key={a.id} style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted35, flexShrink: 0 }}>MAINT.</span>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>{a.label}{a.detail ? ` — ${a.detail}` : ""}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".08em", color: SERVICE_DOT[a.state] }}>{SERVICE_LABEL[a.state]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onIncident}
            style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".14em", padding: 16, borderRadius: 12, background: "transparent", border: "1px solid rgba(236,32,38,.4)", color: C.koText, cursor: "pointer", transition: "all .25s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(236,32,38,.12)"; e.currentTarget.style.borderColor = C.ko; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(236,32,38,.4)"; }}>
            ▲ SIMULER UN INCIDENT
          </button>
        </div>

        {/* Grille services */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: "min-content", gap: 16, overflowY: "auto", alignContent: "start", paddingBottom: 20 }}>
          {services.length === 0 && (
            <div style={{ color: C.muted45, fontFamily: MONO, fontSize: 13, gridColumn: "1 / -1" }}>
              {panel ? "AUCUN SERVICE SUPERVISÉ" : "CHARGEMENT…"}
            </div>
          )}
          {services.map((s: ServiceNode) => {
            const dot = SERVICE_DOT[s.state];
            const lat = s.latencyMs != null ? O(Math.round(s.latencyMs)) : "—";
            return (
              <div key={s.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...glass(0.035, 0.07), padding: "22px 26px", transition: "all .25s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(90,200,250,.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(238,240,242,.07)"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: dot, boxShadow: `0 0 12px ${dot}` }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".1em", color: C.muted40, textTransform: "uppercase" }}>{SERVICE_LABEL[s.state]}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700 }}>{lat}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", color: C.muted35 }}>MS</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
