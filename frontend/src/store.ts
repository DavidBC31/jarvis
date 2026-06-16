import { create } from "zustand";
import type {
  DashboardState,
  PanelId,
  RagContext,
  RagPhase,
  WsMessage,
} from "./types";

export type ConnectionStatus = "connecting" | "online" | "reconnecting";

export interface RagState {
  phase: RagPhase;
  question: string;
  answer: string;
  context?: RagContext;
}

// État initial du panneau Jarvis = scénario de démonstration de la maquette.
const initialRag: RagState = {
  phase: "idle",
  question: "J'ai un problème avec l'imprimante",
  answer:
    "Je consulte la BDD Bleu Citron… Quel est le code d'erreur sur l'écran (ex. E2, F5) ?",
  context: { equipment: "Toshiba e-Studio 3515ac", procedure: "Dépannage Général" },
};

interface DashboardStore {
  state: DashboardState | null;
  connection: ConnectionStatus;
  rag: RagState;
  setConnection: (c: ConnectionStatus) => void;
  applyMessage: (msg: WsMessage) => void;
}

export const useDashboard = create<DashboardStore>((set) => ({
  state: null,
  connection: "connecting",
  rag: initialRag,
  setConnection: (connection) => set({ connection }),
  applyMessage: (msg) =>
    set((store) => {
      if (msg.type === "snapshot") {
        return { state: msg.data, connection: "online" };
      }
      if (msg.type === "panel.update" && store.state) {
        return {
          state: { ...store.state, [msg.panel as PanelId]: msg.data as never },
        };
      }
      if (msg.type === "rag.event") {
        const ev = msg.data;
        const rag = { ...store.rag };
        switch (ev.kind) {
          case "phase":
            rag.phase = ev.phase;
            break;
          case "transcript":
            rag.question = ev.text;
            rag.answer = ""; // nouvelle demande → on repart d'une réponse vide
            break;
          case "context":
            rag.context = {
              equipment: ev.equipment,
              procedure: ev.procedure,
              sourceId: ev.sourceId,
            };
            break;
          case "answer.delta":
            rag.answer += ev.text;
            break;
          case "answer.done":
          case "audio.level":
            break;
        }
        return { rag };
      }
      return {};
    }),
}));
