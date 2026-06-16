import { useState } from "react";
import { Panel } from "../Panel";
import { useDashboard } from "../../store";
import type { RagPhase } from "../../types";

const PHASE_LABEL: Record<RagPhase, string> = {
  idle: "READY",
  listening: "LISTENING…",
  thinking: "CONSULTING DB…",
  speaking: "RESPONDING…",
};

export function JarvisPanel() {
  const rag = useDashboard((s) => s.rag);
  const [input, setInput] = useState("");
  const busy = rag.phase !== "idle";

  const ask = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    try {
      await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
    } catch {
      /* l'UI est pilotée par les rag.event du WebSocket */
    }
  };

  return (
    <Panel title="JARVIS — KNOWLEDGE RAG ASSISTANT" subtitle="VOCAL & CONTEXTUEL">
      <div className="flex gap-4 h-full">
        <Orb phase={rag.phase} />
        <div className="flex-1 min-w-0 flex flex-col gap-2 text-xs">
          <div className="space-y-2 overflow-auto">
            <p>
              <span className="text-status-new font-display tracking-wider">DEMANDE :</span>{" "}
              {rag.question}
            </p>
            {rag.answer && (
              <p>
                <span className="neon-text font-display tracking-wider">
                  JARVIS (RAG knowledge base) :
                </span>{" "}
                {rag.answer}
                {rag.phase === "speaking" && <span className="animate-pulse">▌</span>}
              </p>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              <span title="Micro (à venir)">🎙️ MIC</span>
              <span title="Base de documents">🗄️ BDD</span>
              <span className="ml-auto tracking-widest" style={{ color: "var(--neon-cyan)" }}>
                {PHASE_LABEL[rag.phase]}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
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
                  CURRENT DOCUMENT CONTEXT
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
  const duration = phase === "speaking" ? "0.8s" : phase === "thinking" ? "1.4s" : "3s";
  return (
    <div
      className="shrink-0 self-center rounded-full"
      style={{
        width: 110,
        height: 110,
        background:
          "radial-gradient(circle at 50% 45%, var(--neon-cyan) 0%, var(--neon-cyan-dim) 35%, transparent 70%)",
        boxShadow: "0 0 30px var(--neon-cyan)",
        animation: `pulse-glow ${duration} ease-in-out infinite`,
      }}
    />
  );
}
