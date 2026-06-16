import { useDashboard } from "./store";
import type { WsMessage } from "./types";

// Reconnexion exponentielle plafonnée (2s, 4s, 8s, 16s).
const BACKOFFS = [2000, 4000, 8000, 16000];

function wsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

/** Ouvre la connexion temps réel et alimente le store. Renvoie un cleanup. */
export function connectDashboard(): () => void {
  const { setConnection, applyMessage } = useDashboard.getState();
  let socket: WebSocket | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const open = () => {
    setConnection(attempt === 0 ? "connecting" : "reconnecting");
    socket = new WebSocket(wsUrl());

    socket.onopen = () => {
      attempt = 0;
    };
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsMessage;
        applyMessage(msg);
      } catch {
        /* message non-JSON ignoré */
      }
    };
    socket.onclose = () => {
      if (closed) return;
      const delay = BACKOFFS[Math.min(attempt, BACKOFFS.length - 1)];
      attempt += 1;
      setConnection("reconnecting");
      retryTimer = setTimeout(open, delay);
    };
    socket.onerror = () => socket?.close();
  };

  open();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
  };
}
