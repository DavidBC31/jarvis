import { useEffect, useRef, useState } from "react";
import { useDashboard } from "../store";
import { C, O, MONO, clockStr, dateStr, pad } from "./util";
import { Projets } from "./screens/Projets";
import { Systemes } from "./screens/Systemes";
import { Vocal } from "./screens/Vocal";

type Screen = "projets" | "systemes" | "vocal";
const NAV: { id: Screen; label: string }[] = [
  { id: "projets", label: "PROJETS" },
  { id: "systemes", label: "SYSTÈMES" },
  { id: "vocal", label: "VOCAL" },
];

// Rotation automatique (affichage permanent en open space) : après 1 min sans
// activité, Projets et Systèmes s'enchaînent, chacun avec sa durée d'affichage.
const IDLE_MS = 60_000;
const DWELL_MS: Partial<Record<Screen, number>> = { projets: 60_000, systemes: 30_000 };
const NEXT: Partial<Record<Screen, Screen>> = { projets: "systemes", systemes: "projets" };

/** Horodatage de la dernière interaction (souris, clavier, tactile). */
function useLastActivity() {
  const last = useRef(Date.now());
  useEffect(() => {
    let lx = -1, ly = -1;
    const bump = () => { last.current = Date.now(); };
    // Chrome peut émettre des mousemove sans déplacement réel : on les ignore.
    const onMove = (e: MouseEvent) => {
      if (e.clientX === lx && e.clientY === ly) return;
      lx = e.clientX; ly = e.clientY; bump();
    };
    const evs = ["mousedown", "keydown", "touchstart", "wheel"] as const;
    evs.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      evs.forEach((ev) => window.removeEventListener(ev, bump));
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  return last;
}

function useScale() {
  const [scale, setScale] = useState(() =>
    Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
  useEffect(() => {
    const r = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  return scale;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Atlas() {
  const scale = useScale();
  const now = useClock();
  const [screen, setScreen] = useState<Screen>("projets");
  const [incident, setIncident] = useState(false);
  const [incidentStart, setIncidentStart] = useState<Date | null>(null);

  const connection = useDashboard((s) => s.connection);
  const footer = useDashboard((s) => s.state?.footer);
  const services = useDashboard((s) => s.state?.services);
  const projects = useDashboard((s) => s.state?.projects);
  const ragPhase = useDashboard((s) => s.rag.phase);

  const healthy = (footer?.globalStatus?.healthy ?? true) && connection === "online";

  const lastActivity = useLastActivity();
  const screenSince = useRef(Date.now());
  const go = (s: Screen) => { setScreen(s); screenSince.current = Date.now(); };
  const triggerIncident = () => { setIncident(true); setIncidentStart(new Date()); };

  // Moteur de rotation, évalué à chaque tick d'horloge (1 s).
  const t = now.getTime();
  const idle = t - lastActivity.current >= IDLE_MS;
  const dwell = DWELL_MS[screen];
  const shownFor = t - Math.max(screenSince.current, lastActivity.current);
  useEffect(() => {
    if (incident) return;
    if (ragPhase !== "idle") { lastActivity.current = Date.now(); return; } // Jarvis parle/écoute
    if (!idle) return;
    if (!dwell) go("projets");                    // écran hors rotation (Vocal) → on la reprend
    else if (shownFor >= dwell) go(NEXT[screen]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
  const autoProgress = idle && dwell && !incident ? Math.min(1, shownFor / dwell) : null;

  let incidentDuree = "—";
  if (incidentStart) {
    const sec = Math.floor((now.getTime() - incidentStart.getTime()) / 1000);
    incidentDuree = sec < 60 ? O(sec) + " S" : O(Math.floor(sec / 60)) + " MIN " + O(pad(sec % 60)) + " S";
  }

  // Ticker : agrégats réels + repères.
  const activeProj = (projects?.projects ?? []).filter(p => p.keyStatus !== "done" && p.keyStatus !== "paused").length;
  const tickerItems = [
    `ATLAS v2.4 — ${(footer?.globalStatus?.label ?? "SYSTÈMES NOMINAUX").toUpperCase()}`,
    `SERVICES : ${O(services?.upCount ?? 0)}/${O(services?.total ?? 0)} EN LIGNE`,
    `PROJETS ACTIFS : ${O(activeProj)}`,
    footer?.macStudio ? `MAC STUDIO · ${O(footer.macStudio.temperatureC)}°C · CPU ${O(footer.macStudio.cpuLoadPercent)} %` : "SUPERVISION TEMPS RÉEL",
    "SAUVEGARDES : 1OO % VERTES",
  ];

  const orbVisible = screen !== "vocal" && !incident;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: C.bg }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%", width: 1920, height: 1080, overflow: "hidden",
        background: C.bg, transform: `translate(-50%,-50%) scale(${scale})`, color: C.text,
        fontFamily: "'Space Grotesk','Helvetica Neue',sans-serif", letterSpacing: "-0.01em",
      }}>
        {/* ── Ambiance ── */}
        <div style={{ position: "absolute", top: "-25%", left: "-15%", width: "70%", height: "80%", background: "radial-gradient(ellipse at center,rgba(20,80,226,.22),transparent 65%)", animation: "drift1 26s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-30%", right: "-10%", width: "65%", height: "85%", background: "radial-gradient(ellipse at center,rgba(90,200,250,.13),transparent 65%)", animation: "drift2 34s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", right: "25%", width: "40%", height: "50%", background: "radial-gradient(ellipse at center,rgba(8,58,157,.28),transparent 70%)", animation: "drift1 40s ease-in-out infinite reverse", pointerEvents: "none" }} />

        {/* Noyau 3D gyroscopique */}
        <div style={{ position: "absolute", top: "50%", right: -180, width: 860, height: 860, transform: "translateY(-50%)", perspective: 1500, opacity: 0.32, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(90,200,250,.55)", animation: "gyroA 26s linear infinite" }} />
          <div style={{ position: "absolute", inset: 70, borderRadius: "50%", border: "1px solid rgba(20,80,226,.6)", animation: "gyroB 34s linear infinite" }} />
          <div style={{ position: "absolute", inset: 150, borderRadius: "50%", border: "1.5px solid rgba(90,200,250,.4)", animation: "gyroC 22s linear infinite" }} />
          <div style={{ position: "absolute", inset: 240, borderRadius: "50%", border: "1px dashed rgba(238,240,242,.3)", animation: "gyroA 44s linear infinite reverse" }} />
          <div style={{ position: "absolute", inset: "34%", borderRadius: "50%", background: "radial-gradient(circle at 40% 35%,rgba(90,200,250,.5),rgba(20,80,226,.35) 50%,transparent 75%)", filter: "blur(6px)" }} />
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, height: 140, background: "linear-gradient(180deg,transparent,rgba(90,200,250,.04),rgba(90,200,250,.1),transparent)", animation: "scanSweep 11s linear infinite", pointerEvents: "none" }} />

        {/* Coins HUD */}
        <div style={{ position: "absolute", top: 18, left: 20, width: 26, height: 26, borderTop: "2px solid rgba(90,200,250,.35)", borderLeft: "2px solid rgba(90,200,250,.35)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 18, right: 20, width: 26, height: 26, borderTop: "2px solid rgba(90,200,250,.35)", borderRight: "2px solid rgba(90,200,250,.35)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 58, left: 20, width: 26, height: 26, borderBottom: "2px solid rgba(90,200,250,.35)", borderLeft: "2px solid rgba(90,200,250,.35)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 58, right: 20, width: 26, height: 26, borderBottom: "2px solid rgba(90,200,250,.35)", borderRight: "2px solid rgba(90,200,250,.35)", pointerEvents: "none" }} />

        {/* Grille + vignette */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(238,240,242,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(238,240,242,.025) 1px,transparent 1px)", backgroundSize: "72px 72px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 120% 90% at 50% 40%,transparent 55%,rgba(3,6,15,.7))", pointerEvents: "none" }} />

        {/* ── Header ── */}
        <div style={{ position: "relative", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", height: 96, padding: "0 56px", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, minWidth: 0 }}>
            <div style={{ background: C.text, color: C.bg, padding: "9px 14px", borderRadius: 6, fontWeight: 700, fontSize: 15, lineHeight: 1.05, letterSpacing: "-.02em" }}>BLEU<br />CITRON</div>
            <div style={{ width: 1, height: 36, background: "rgba(238,240,242,.15)" }} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: ".22em" }}>ATLAS</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted45, letterSpacing: ".14em", textTransform: "uppercase" }}>supervision · v2.4</div>
            </div>
          </div>

          <div style={{ position: "relative", flexShrink: 0 }}>
          {/* Rotation auto : fine jauge du temps restant avant l'écran suivant */}
          {autoProgress !== null && (
            <div style={{ position: "absolute", left: 24, right: 24, bottom: -10, height: 2, borderRadius: 1, background: "rgba(238,240,242,.08)", overflow: "hidden" }}>
              <div key={screen} style={{ height: "100%", width: `${autoProgress * 100}%`, background: C.teal, opacity: 0.6, transition: "width 1s linear" }} />
            </div>
          )}
          <nav style={{ display: "flex", gap: 4, background: "rgba(238,240,242,.05)", backdropFilter: "blur(30px) saturate(160%)", border: "1px solid rgba(238,240,242,.09)", borderRadius: 9999, padding: 5, boxShadow: "0 2px 20px rgba(0,0,0,.3)", flexShrink: 0 }}>
            {NAV.map((n) => {
              const active = screen === n.id;
              return (
                <button key={n.id} onClick={() => go(n.id)}
                  style={{ fontFamily: MONO, fontSize: 12.5, letterSpacing: ".12em", padding: "11px 24px", borderRadius: 9999, border: "none", cursor: "pointer", transition: "all .25s", background: active ? C.blue : "transparent", color: active ? "#fff" : C.muted55 }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = C.muted55; }}>
                  {n.label}
                </button>
              );
            })}
          </nav>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 22, flex: 1, justifyContent: "flex-end" }}>
            <button title="Administration des projets"
              onClick={() => { location.hash = "admin"; }}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted40, fontSize: 20, lineHeight: 1, padding: 4, transition: "color .25s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.teal)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted40)}>
              ⚙
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: healthy ? "rgba(52,199,89,.09)" : "rgba(236,32,38,.1)", border: `1px solid ${healthy ? "rgba(52,199,89,.25)" : "rgba(236,32,38,.3)"}`, borderRadius: 9999, padding: "8px 16px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: healthy ? C.ok : C.ko, animation: "blinkDot 2.4s infinite" }} />
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", color: healthy ? C.okText : C.koText }}>
                {connection !== "online" ? "CONNEXION…" : healthy ? "NOMINAL" : "INCIDENT"}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, letterSpacing: ".06em", lineHeight: 1 }}>{O(clockStr(now))}</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted45, letterSpacing: ".14em", textTransform: "uppercase" }}>{O(dateStr(now))}</div>
            </div>
          </div>
        </div>

        {/* ── Écran actif ── */}
        {screen === "projets" && <Projets />}
        {screen === "systemes" && <Systemes onIncident={triggerIncident} />}
        {screen === "vocal" && <Vocal />}

        {/* ── Ticker ── */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 6, height: 42, borderTop: "1px solid rgba(238,240,242,.07)", background: "rgba(6,11,29,.6)", backdropFilter: "blur(20px)", overflow: "hidden", display: "flex", alignItems: "center" }}>
          <div style={{ display: "inline-flex", whiteSpace: "nowrap", gap: 56, animation: "atlasTicker 46s linear infinite", fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", color: C.muted40 }}>
            {[...tickerItems, ...tickerItems].map((it, i) => (
              <span key={i} style={i === tickerItems.length * 2 - 1 ? { paddingRight: 56 } : undefined}>{it}</span>
            ))}
          </div>
        </div>

        {/* ── Orbe persistant ── */}
        {orbVisible && (
          <div onClick={() => go("vocal")} title="Invoquer l'assistant vocal"
            style={{ position: "absolute", bottom: 70, right: 56, zIndex: 8, width: 74, height: 74, cursor: "pointer", perspective: 500 }}>
            <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "1px solid rgba(90,200,250,.4)", animation: "gyroA 12s linear infinite" }} />
            <div style={{ position: "absolute", inset: -18, borderRadius: "50%", border: "1px dashed rgba(90,200,250,.25)", animation: "gyroB 18s linear infinite" }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,rgba(143,217,255,.9),rgba(20,80,226,.85) 45%,#083a9d 80%)", animation: "orbPulse 3.6s ease-in-out infinite" }} />
          </div>
        )}

        {/* ── Mode incident ── */}
        {incident && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(8,3,5,.94)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "riseInFast .3s ease-out" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 70% at 50% 50%,rgba(236,32,38,.14),transparent 70%)", animation: "incidentGlow 2.2s ease-in-out infinite", pointerEvents: "none" }} />
            <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".5em", color: C.ko, marginBottom: 26, animation: "blinkDot 1.4s infinite" }}>▲ INCIDENT CRITIQUE ▲</div>
            <h1 style={{ margin: "0 0 14px", fontSize: 64, fontWeight: 700, letterSpacing: "-.03em", textAlign: "center" }}>API Paiement — hors service</h1>
            <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: ".1em", color: "rgba(238,240,242,.6)", marginBottom: 44 }}>DÉTECTÉ IL Y A {incidentDuree} · IMPACT : BILLETTERIE EN LIGNE</div>
            <div style={{ display: "flex", gap: 18, marginBottom: 52 }}>
              <div style={{ background: "rgba(236,32,38,.08)", border: "1px solid rgba(236,32,38,.3)", borderRadius: 16, padding: "22px 34px", textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: C.koText }}>5O3</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: C.muted45, marginTop: 6 }}>CODE ERREUR</div>
              </div>
              <div style={{ background: "rgba(236,32,38,.08)", border: "1px solid rgba(236,32,38,.3)", borderRadius: 16, padding: "22px 34px", textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: C.koText }}>1OO %</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: C.muted45, marginTop: 6 }}>REQUÊTES EN ÉCHEC</div>
              </div>
              <div style={{ background: "rgba(238,240,242,.04)", border: "1px solid rgba(238,240,242,.12)", borderRadius: 16, padding: "22px 34px", textAlign: "center" }}>
                <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700 }}>ATLAS</div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: C.okText, marginTop: 6 }}>REDÉMARRAGE AUTO EN COURS</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <button onClick={() => setIncident(false)}
                style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".14em", padding: "16px 36px", borderRadius: 9999, background: C.ko, border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, transition: "all .25s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#c4161b")}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.ko)}>ACQUITTER</button>
              <button onClick={() => { setIncident(false); go("systemes"); }}
                style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".14em", padding: "16px 36px", borderRadius: 9999, background: "transparent", border: "1px solid rgba(238,240,242,.25)", color: C.text, cursor: "pointer", transition: "all .25s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(238,240,242,.25)")}>VOIR LES SYSTÈMES</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
