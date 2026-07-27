import { useDashboard } from "../../store";
import { C, O, glass, MONO, TICKET_DOT, TICKET_LABEL, shortWhen } from "../util";

export function Infogerance() {
  const tPanel = useDashboard((s) => s.state?.tickets);
  const sPanel = useDashboard((s) => s.state?.services);
  const pPanel = useDashboard((s) => s.state?.projects);

  const tickets = tPanel?.tickets ?? [];
  const total = tPanel?.total ?? tickets.length;
  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;

  const env = [
    { k: "Services supervisés", v: O(sPanel?.total ?? 0) },
    { k: "Projets suivis", v: O(pPanel?.projects?.length ?? 0) },
    { k: "Tickets ouverts", v: O(total - resolved) },
    { k: "Services en ligne", v: O(sPanel?.upCount ?? 0) },
  ];

  return (
    <div style={{ position: "relative", zIndex: 4, padding: "28px 64px 0", animation: "riseIn .45s ease-out", height: "calc(100% - 96px)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 42, fontWeight: 700, letterSpacing: "-.03em" }}>Infogérance</h1>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".14em", color: C.muted5 }}>
          {O(total)} TICKETS · {O(resolved)} RÉSOLUS
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, height: "calc(100% - 90px)" }}>
        {/* Liste tickets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingBottom: 20 }}>
          {tickets.length === 0 && (
            <div style={{ color: C.muted45, fontFamily: MONO, fontSize: 13 }}>
              {tPanel ? "AUCUN TICKET" : "CHARGEMENT…"}
            </div>
          )}
          {tickets.map((t) => {
            const dot = TICKET_DOT[t.status];
            return (
              <div key={t.id}
                style={{ display: "grid", gridTemplateColumns: "120px 1fr 150px 170px 90px", alignItems: "center", gap: 24, ...glass(0.035, 0.07), padding: "19px 26px", transition: "all .25s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(90,200,250,.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(238,240,242,.07)"; }}>
                <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted5 }}>{O(t.id)}</div>
                <div style={{ fontSize: 17, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.subject}</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: C.muted45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.assignedTo ?? "NON ASSIGNÉ"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
                  <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: ".08em", color: dot }}>{TICKET_LABEL[t.status]}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted40, textAlign: "right" }}>{O(shortWhen(t.updatedAt))}</div>
              </div>
            );
          })}
        </div>

        {/* Colonne droite */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...glass(0.04, 0.08), padding: "26px 30px" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: C.muted45, textTransform: "uppercase", marginBottom: 18 }}>Environnement connu</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {env.map((e) => (
                <div key={e.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 15, color: "rgba(238,240,242,.75)" }}>{e.k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: C.teal }}>{e.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(52,199,89,.06)", border: "1px solid rgba(52,199,89,.2)", borderRadius: 16, padding: "26px 30px" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: C.okText, textTransform: "uppercase", marginBottom: 10 }}>Tickets résolus</div>
            <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, lineHeight: 1, color: C.okText }}>{O(resolved)}</div>
            <div style={{ fontSize: 13, color: C.muted5, marginTop: 10 }}>tickets clôturés ou résolus</div>
          </div>
        </div>
      </div>
    </div>
  );
}
