import { useEffect, useRef, useState } from "react";
import { useDashboard } from "../../store";
import { useVoice } from "../../hooks/useVoice";
import { C, MONO } from "../util";
import type { RagPhase } from "../../types";

const PHASE_LABEL: Record<RagPhase, string> = {
  idle: "ÉCOUTE",
  listening: "JE VOUS ÉCOUTE",
  thinking: "CONSULTATION…",
  speaking: "RÉPONSE…",
};

const SUGGESTIONS = [
  "Quels projets sont prioritaires ?",
  "Quels services sont dégradés ?",
  "Quels projets sont en recettage ?",
];

export function Vocal() {
  const rag = useDashboard((s) => s.rag);
  const voice = useVoice("fr-FR");
  const [muted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const busy = rag.phase === "thinking" || rag.phase === "speaking";
  const phase: RagPhase = voice.listening ? "listening" : rag.phase;

  const submit = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    try {
      const res = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const body = (await res.json()) as { answer?: string };
      if (body.answer && !mutedRef.current) voice.speak(body.answer);
    } catch { /* piloté par les rag.event du WebSocket */ }
  };

  const listen = () => {
    if (voice.listening) { voice.stopListening(); return; }
    voice.cancelSpeak();
    voice.startListening((t) => void submit(t));
  };

  // « Maintenez espace » pour parler.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !voice.listening && !busy) {
        e.preventDefault();
        voice.cancelSpeak();
        voice.startListening((t) => void submit(t));
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space" && voice.listening) { e.preventDefault(); voice.stopListening(); }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening, busy]);

  const chips: string[] = [];
  if (rag.context?.equipment) chips.push(`RAG · ${rag.context.equipment}`);
  if (rag.context?.procedure) chips.push(`doc · ${rag.context.procedure}`);

  return (
    <div style={{ position: "relative", zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20, animation: "riseIn .45s ease-out", height: "calc(100% - 96px)", overflowY: "auto" }}>
      <div style={{ position: "relative", width: 250, height: 250, marginBottom: 8, perspective: 900, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: -26, borderRadius: "50%", border: "1.5px solid rgba(90,200,250,.5)", animation: "gyroA 14s linear infinite" }} />
        <div style={{ position: "absolute", inset: -44, borderRadius: "50%", border: "1px solid rgba(20,80,226,.5)", animation: "gyroB 20s linear infinite" }} />
        <div style={{ position: "absolute", inset: -60, borderRadius: "50%", border: "1px dashed rgba(238,240,242,.25)", animation: "gyroC 26s linear infinite" }} />
        <div onClick={listen} title="Cliquez pour parler"
          style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,rgba(143,217,255,.9),rgba(20,80,226,.85) 45%,rgba(8,58,157,.95) 75%,#083a9d)", animation: "orbPulse 3.6s ease-in-out infinite", cursor: "pointer" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 11, letterSpacing: ".3em", color: "rgba(255,255,255,.85)", pointerEvents: "none", textAlign: "center" }}>
          {PHASE_LABEL[phase]}
        </div>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".18em", color: C.muted45, marginBottom: 28, textAlign: "center" }}>
        {voice.sttSupported ? "RAG CONNECTÉ · ‹ CLIQUEZ L'ORBE OU MAINTENEZ ESPACE ›" : "MICRO INDISPONIBLE · SAISIE MANUELLE CI-DESSOUS"}
      </div>

      <div style={{ width: 880, maxWidth: "88%", display: "flex", flexDirection: "column", gap: 14 }}>
        {rag.question && (
          <div style={{ alignSelf: "flex-end", background: "rgba(20,80,226,.25)", border: "1px solid rgba(20,80,226,.45)", borderRadius: "16px 16px 4px 16px", padding: "14px 22px", fontSize: 17, maxWidth: "70%" }}>
            {rag.question}
          </div>
        )}
        {rag.answer && (
          <div style={{ alignSelf: "flex-start", background: "rgba(238,240,242,.05)", backdropFilter: "blur(24px)", border: "1px solid rgba(238,240,242,.09)", borderRadius: "16px 16px 16px 4px", padding: "18px 24px", fontSize: 17, lineHeight: 1.55, maxWidth: "82%" }}>
            {rag.answer}{phase === "speaking" && <span style={{ opacity: 0.6 }}>▌</span>}
            {chips.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {chips.map((ch, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".08em", padding: "5px 12px", borderRadius: 9999, background: "rgba(90,200,250,.1)", border: "1px solid rgba(90,200,250,.25)", color: C.teal }}>{ch}</span>
                ))}
              </div>
            )}
          </div>
        )}
        {voice.error && (
          <div style={{ alignSelf: "center", fontFamily: MONO, fontSize: 12, color: C.koText }}>⚠ {voice.error}</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 30, flexWrap: "wrap", justifyContent: "center" }}>
        {SUGGESTIONS.map((q) => (
          <div key={q} onClick={() => void submit(q)}
            style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".06em", padding: "11px 20px", borderRadius: 9999, border: "1px solid rgba(238,240,242,.14)", color: C.muted55, cursor: "pointer", transition: "all .25s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(238,240,242,.14)"; e.currentTarget.style.color = C.muted55; }}>
            {q}
          </div>
        ))}
      </div>
    </div>
  );
}
