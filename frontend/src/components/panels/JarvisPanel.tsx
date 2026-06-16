import { useRef, useState } from "react";
import { Panel } from "../Panel";
import { useDashboard } from "../../store";
import { useVoice } from "../../hooks/useVoice";
import { useWakeWord } from "../../hooks/useWakeWord";
import type { RagPhase } from "../../types";

const PHASE_LABEL: Record<RagPhase, string> = {
  idle: "PRÊT",
  listening: "ÉCOUTE…",
  thinking: "CONSULTATION BDD…",
  speaking: "RÉPONSE…",
};

export function JarvisPanel() {
  const rag = useDashboard((s) => s.rag);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [wake, setWake] = useState(false);
  const voice = useVoice("fr-FR");
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const busy = rag.phase === "thinking" || rag.phase === "speaking";
  // Phase effective : la reconnaissance vocale est locale, le reste vient du serveur.
  const phase: RagPhase = voice.listening ? "listening" : rag.phase;

  // Mot-clé « Hey Jarvis » : écoute continue, en pause pendant que Jarvis
  // parle/réfléchit ou pendant une saisie micro (évite l'auto-déclenchement).
  useWakeWord({
    enabled: wake,
    paused: busy || voice.listening,
    onCommand: (q) => {
      setInput(q);
      void submit(q);
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
      /* l'UI reste pilotée par les rag.event du WebSocket */
    }
  };

  const onMic = () => {
    if (voice.listening) {
      voice.stopListening();
      return;
    }
    voice.cancelSpeak();
    voice.startListening((transcript) => {
      setInput(transcript);
      void submit(transcript);
    });
  };

  return (
    <Panel title="JARVIS — ASSISTANT RAG" subtitle="VOCAL & CONTEXTUEL">
      <div className="flex gap-4 h-full">
        <Orb phase={phase} />
        <div className="flex-1 min-w-0 flex flex-col gap-2 text-xs">
          <div className="space-y-2 overflow-auto">
            <p>
              <span className="text-status-new font-display tracking-wider">DEMANDE :</span>{" "}
              {rag.question}
            </p>
            {rag.answer && (
              <p>
                <span className="neon-text font-display tracking-wider">
                  JARVIS (base documentaire) :
                </span>{" "}
                {rag.answer}
                {rag.phase === "speaking" && <span className="animate-pulse">▌</span>}
              </p>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              <button
                type="button"
                onClick={onMic}
                disabled={!voice.sttSupported || busy}
                title={voice.sttSupported ? "Parler à Jarvis" : "Reconnaissance vocale indisponible"}
                className="disabled:opacity-40"
                style={{ color: voice.listening ? "var(--neon-cyan)" : undefined }}
              >
                🎙️ {voice.listening ? "ÉCOUTE…" : "MIC"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMuted((m) => !m);
                  if (!muted) voice.cancelSpeak();
                }}
                disabled={!voice.ttsSupported}
                title={muted ? "Réactiver la voix" : "Couper la voix"}
                className="disabled:opacity-40"
              >
                {muted ? "🔇" : "🔊"}
              </button>
              <button
                type="button"
                onClick={() => setWake((w) => !w)}
                disabled={!voice.sttSupported}
                title={
                  voice.sttSupported
                    ? 'Activation vocale par mot-clé : dites « Hey Jarvis, … »'
                    : "Reconnaissance vocale indisponible"
                }
                className="disabled:opacity-40"
                style={{ color: wake ? "var(--neon-cyan)" : undefined }}
              >
                {wake ? "🟢" : "⚪"} Hey Jarvis
              </button>
              <span title="Base de documents">🗄️ BDD</span>
              <span className="ml-auto tracking-widest" style={{ color: "var(--neon-cyan)" }}>
                {PHASE_LABEL[phase]}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder="Poser une question à Jarvis…"
                className="flex-1 bg-transparent neon-border rounded px-2 py-1 text-xs disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded px-3 py-1 text-[10px] tracking-widest text-bg-base font-display disabled:opacity-40"
                style={{ background: "var(--neon-cyan)" }}
              >
                ENVOYER
              </button>
            </form>

            {rag.context && (
              <div className="neon-border rounded p-2 text-[11px]">
                <div className="text-text-muted tracking-widest text-[9px]">
                  CONTEXTE DOCUMENTAIRE
                </div>
                {rag.context.equipment} / {rag.context.procedure}
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Orb({ phase }: { phase: RagPhase }) {
  // Vitesse de pulsation indexée sur la phase (visualiseur audio à venir).
  const duration =
    phase === "speaking" ? "0.8s" : phase === "listening" ? "0.6s" : phase === "thinking" ? "1.4s" : "3s";
  const color = phase === "listening" ? "var(--status-new, #38bdf8)" : "var(--neon-cyan)";
  return (
    <div
      className="shrink-0 self-center rounded-full"
      style={{
        width: 110,
        height: 110,
        background: `radial-gradient(circle at 50% 45%, ${color} 0%, var(--neon-cyan-dim) 35%, transparent 70%)`,
        boxShadow: `0 0 30px ${color}`,
        animation: `pulse-glow ${duration} ease-in-out infinite`,
      }}
    />
  );
}
