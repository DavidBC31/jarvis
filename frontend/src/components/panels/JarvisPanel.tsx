import { Panel } from "../Panel";

// Brique 1 : maquette statique du panneau RAG (orbe + dialogue de démo +
// contexte document). Le flux vocal/RAG temps réel arrivera dans une brique
// dédiée (STT → recherche vectorielle → Claude → TTS).
export function JarvisPanel() {
  return (
    <Panel title="JARVIS — KNOWLEDGE RAG ASSISTANT" subtitle="VOCAL & CONTEXTUEL">
      <div className="flex gap-4 h-full">
        <Orb />
        <div className="flex-1 min-w-0 flex flex-col gap-2 text-xs">
          <div className="space-y-2">
            <p>
              <span className="text-status-new font-display tracking-wider">
                VOICE DEMAND :
              </span>{" "}
              J'ai un problème avec l'imprimante
            </p>
            <p>
              <span className="neon-text font-display tracking-wider">
                JARVIS (RAG knowledge base) :
              </span>{" "}
              Je consulte la BDD Bleu Citron… Quel est le code d'erreur sur l'écran
              (ex. E2, F5) ?
            </p>
          </div>
          <div className="mt-auto flex items-center gap-3 text-[10px] text-text-muted">
            <span>🎙️ MIC</span>
            <span>🗄️ BDD</span>
          </div>
          <div className="neon-border rounded p-2 text-[11px]">
            <div className="text-text-muted tracking-widest text-[9px]">
              CURRENT DOCUMENT CONTEXT
            </div>
            Toshiba e-Studio 3515ac / Dépannage Général
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Orb() {
  // Orbe statique (anneaux + lueur). Visualiseur audio réactif en brique RAG.
  return (
    <div
      className="shrink-0 self-center rounded-full"
      style={{
        width: 110,
        height: 110,
        background:
          "radial-gradient(circle at 50% 45%, var(--neon-cyan) 0%, var(--neon-cyan-dim) 35%, transparent 70%)",
        boxShadow: "0 0 30px var(--neon-cyan)",
        animation: "pulse-glow 3s ease-in-out infinite",
      }}
    />
  );
}
