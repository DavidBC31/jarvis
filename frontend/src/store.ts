import { create } from "zustand";
import type { DashboardState, PanelId, WsMessage } from "./types";

export type ConnectionStatus = "connecting" | "online" | "reconnecting";

interface DashboardStore {
  state: DashboardState | null;
  connection: ConnectionStatus;
  setConnection: (c: ConnectionStatus) => void;
  applyMessage: (msg: WsMessage) => void;
}

export const useDashboard = create<DashboardStore>((set) => ({
  state: null,
  connection: "connecting",
  setConnection: (connection) => set({ connection }),
  applyMessage: (msg) =>
    set((store) => {
      if (msg.type === "snapshot") {
        return { state: msg.data, connection: "online" };
      }
      if (msg.type === "panel.update" && store.state) {
        const panel = msg.panel as PanelId;
        return {
          state: {
            ...store.state,
            [panel]: msg.data as never,
          },
        };
      }
      // rag.event : géré par le panneau 4 (brique ultérieure)
      return {};
    }),
}));
