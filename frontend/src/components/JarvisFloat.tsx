import { useRef, useState } from "react";
import { useDashboard } from "../store";
import { useVoice } from "../hooks/useVoice";
import { useWakeWord } from "../hooks/useWakeWord";
import type { RagPhase } from "../types";

const PHASE_LABEL: Record<RagPhase, string> = {
  idle:      "PRÊT",
  listening: "ÉCOUTE…",
  thinking:  "CONSULTATION BDD…",
  speaking:  "RÉPONSE…",
};

export function JarvisFloat() {
  const [open, setOpen] = useState(false);
  const rag = useDashboard((s) => s.rag);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [wake, setWake] = useState(false);
  const voice = useVoice("fr-FR");
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const busy = rag.phase === "thinking" || rag.phase === "speaking";
  const phase: RagPhase = voice.listening ? "listening" : rag.phase;

  const wakeState = useWakeWord({
    enabled: wake,
    paused: busy || voice.listening,
    onCommand: (q) => {
      setInput(q);
      void submit(q);
      setOpen(true);
    },
  });

  const submit = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    try {
      const res = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const body = (await res.json()) as { answer?: string };
      if (body.answer && !mutedRef.current) voice.speak(body.answer);
    } catch {
      /* piloté par les rag.event du WebSocket */
    }
  };

  const onMic = () => {
    if (voice.listening) { voice.stopListening(); return; }
    voice.cancelSpeak();
    const wasWake = wake;
    if (wasWake) setWake(false);
    setTimeout(() => {
      voice.startListening((transcript) => {
        setInput(transcript);
        void submit(transcript);
        if (wasWake) setWake(true);
      });
    }, 250);
  };

  const duration = phase === "speaking" ? "0.8s" : phase === "listening" ? "0.6s" : phase === "thinking" ? "1.4s" : "3s";
  const glowColor = phase === "listening" ? "var(--status-new, #38bdf8)" : "var(--neon-cyan)";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

      {/* ── Popup chatbot ──────────────────────────────────────────────── */}
      {open && (
        <div
          className="flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 390,
            maxHeight: "62vh",
            background: "rgba(4, 10, 22, 0.96)",
            backdropFilter: "blur(16px)",
            border: "1px solid var(--neon-cyan)",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.5), 0 0 32px rgba(0,229,255,0.18), 0 12px 40px rgba(0,0,0,0.7)",
          }}
        >
          {/* En-tête popup */}
          <div
            className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b"
            style={{ borderColor: "var(--neon-cyan-dim)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: glowColor,
                  boxShadow: `0 0 8px ${glowColor}`,
                  animation: `pulse-glow ${duration} ease-in-out infinite`,
                }}
              />
              <span
                className="font-display text-sm tracking-[0.22em]"
                style={{ color: "var(--neon-cyan)" }}
              >
                JARVIS
              </span>
              <span className="text-[9px] tracking-widest text-text-muted">
                ASSISTANT RAG
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] tracking-widest"
                style={{ color: "var(--neon-cyan)" }}
              >
                {PHASE_LABEL[phase]}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-white text-sm leading-none transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Zone de conversation */}
          <div className="flex-1 min-h-0 overflow-auto px-4 py-3 space-y-3 text-xs">
            {rag.question && (
              <div className="flex justify-end">
                <div
                  className="max-w-[80%] rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(0,229,255,0.1)",
                    border: "1px solid rgba(0,229,255,0.22)",
                  }}
                >
                  <p
                    className="font-display tracking-wider text-[9px] mb-1 opacity-70"
                    style={{ color: "var(--status-new)" }}
                  >
                    VOUS
                  </p>
                  <p>{rag.question}</p>
                </div>
              </div>
            )}
            {rag.answer && (
              <div className="flex justify-start">
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--neon-cyan-dim)",
                  }}
                >
                  <p
                    className="font-display tracking-wider text-[9px] mb-1 opacity-70"
                    style={{ color: "var(--neon-cyan)" }}
                  >
                    JARVIS
                  </p>
                  <p className="leading-relaxed">
                    {rag.answer}
                    {rag.phase === "speaking" && (
                      <span className="animate-pulse">▌</span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {!rag.question && !rag.answer && (
              <p className="text-text-muted text-center py-6 text-[11px]">
                Posez une question à Jarvis…
              </p>
            )}
          </div>

          {/* Contexte documentaire */}
          {rag.context && (
            <div
              className="mx-4 mb-2 rounded-lg px-2.5 py-1.5 text-[10px]"
              style={{
                background: "rgba(0,229,255,0.04)",
                border: "1px solid var(--neon-cyan-dim)",
              }}
            >
              <span className="text-text-muted">📁 </span>
              {rag.context.equipment} / {rag.context.procedure}
            </div>
          )}

          {/* Erreur micro */}
          {voice.error && (
            <p className="mx-4 mb-1 text-[10px] text-status-alert">
              ⚠ {voice.error}
            </p>
          )}

          {/* Retour visuel Hey Jarvis */}
          {wake && (
            <div className="mx-4 mb-1 text-[10px] leading-tight">
              {wakeState.error ? (
                <span className="text-status-alert">⚠ {wakeState.error}</span>
              ) : wakeState.armed ? (
                <span style={{ color: "var(--neon-cyan)" }}>
                  🟢 Je t'écoute — pose ta question…
                </span>
              ) : wakeState.active ? (
                <span className="text-text-muted">
                  🎙️ En attente de « Hey Jarvis »…
                  {wakeState.lastHeard ? ` (« ${wakeState.lastHeard} »)` : ""}
                </span>
              ) : (
                <span className="text-text-muted">Initialisation du micro…</span>
              )}
            </div>
          )}

          {/* Contrôles + saisie */}
          <div className="px-4 pb-4 pt-1 shrink-0 space-y-2 border-t" style={{ borderColor: "var(--neon-cyan-dim)" }}>
            <div className="flex items-center gap-3 pt-2 text-[10px] text-text-muted">
              <button
                type="button"
                onClick={onMic}
                disabled={!voice.sttSupported || busy}
                className="disabled:opacity-40 transition-colors"
                style={{ color: voice.listening ? "var(--neon-cyan)" : undefined }}
              >
                🎙️ {voice.listening ? "ÉCOUTE…" : "MIC"}
              </button>
              <button
                type="button"
                onClick={() => { setMuted((m) => !m); if (!muted) voice.cancelSpeak(); }}
                disabled={!voice.ttsSupported}
                className="disabled:opacity-40"
              >
                {muted ? "🔇" : "🔊"}
              </button>
              <button
                type="button"
                onClick={() => setWake((w) => !w)}
                disabled={!voice.sttSupported}
                className="disabled:opacity-40"
                style={{ color: wake ? "var(--neon-cyan)" : undefined }}
                title='Activation vocale : dites « Hey Jarvis, … »'
              >
                {wake ? "🟢" : "⚪"} Hey Jarvis
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); void submit(input); }}
              className="flex gap-2"
            >
              <input
                id="jarvis-question"
                name="jarvis-question"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder="Posez votre question…"
                className="flex-1 bg-transparent rounded-lg px-3 py-1.5 text-xs disabled:opacity-50 outline-none focus:ring-1"
                style={{
                  border: "1px solid var(--neon-cyan-dim)",
                  // @ts-expect-error custom prop
                  "--tw-ring-color": "var(--neon-cyan)",
                }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-lg px-3 py-1.5 text-xs font-display tracking-widest disabled:opacity-40 transition-opacity"
                style={{ background: "var(--neon-cyan)", color: "var(--bg-base)" }}
              >
                ↵
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Bouton flottant ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col items-center gap-1 focus:outline-none"
        title="Ouvrir Jarvis"
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 45%, ${glowColor} 0%, var(--neon-cyan-dim) 35%, transparent 70%)`,
            boxShadow: `0 0 ${open ? 36 : 22}px ${glowColor}`,
            animation: `pulse-glow ${duration} ease-in-out infinite`,
            border: `1px solid ${glowColor}44`,
            transition: "box-shadow 0.3s",
          }}
        />
        <span
          className="text-[8px] font-display tracking-[0.35em]"
          style={{ color: "var(--neon-cyan)" }}
        >
          JARVIS
        </span>
      </button>
    </div>
  );
}
