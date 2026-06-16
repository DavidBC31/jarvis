import { useEffect, useRef } from "react";
import { getRecognitionCtor, type SpeechRecognitionLike } from "./useVoice";

// Détection d'un mot-clé d'activation (« Hey Jarvis ») en écoute continue, via la
// Web Speech API. À la détection, le texte qui suit le mot-clé est envoyé comme
// commande ; si rien ne suit, on « arme » l'écoute et la phrase suivante devient
// la commande (ex. « Hey Jarvis » … « quelle est la procédure ? »).
//
// `paused` coupe l'écoute (ex. pendant que Jarvis parle, pour éviter l'auto-déclenchement).

const WAKE = "jarvis"; // couvre « hey jarvis », « ok jarvis », « dis jarvis »…
const ARM_TIMEOUT_MS = 8000;

interface Options {
  enabled: boolean;
  paused?: boolean;
  lang?: string;
  onCommand: (text: string) => void;
}

export function useWakeWord({ enabled, paused = false, lang = "fr-FR", onCommand }: Options) {
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    if (!enabled || paused) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    let stopped = false;
    let armed = false;
    let armTimer: ReturnType<typeof setTimeout> | undefined;
    const rec: SpeechRecognitionLike = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;

    const disarm = () => {
      armed = false;
      if (armTimer) clearTimeout(armTimer);
    };
    const arm = () => {
      armed = true;
      if (armTimer) clearTimeout(armTimer);
      armTimer = setTimeout(() => (armed = false), ARM_TIMEOUT_MS);
    };

    rec.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      finalText = finalText.trim();
      if (!finalText) return;

      const k = finalText.toLowerCase().lastIndexOf(WAKE);
      if (k >= 0) {
        const after = finalText.slice(k + WAKE.length).replace(/^[\s,.:!?-]+/, "").trim();
        if (after.length >= 2) {
          disarm();
          onCommandRef.current(after);
        } else {
          arm(); // mot-clé seul → on attend la phrase suivante
        }
      } else if (armed) {
        disarm();
        onCommandRef.current(finalText);
      }
    };
    rec.onerror = () => {};
    rec.onend = () => {
      // Chrome arrête périodiquement l'écoute continue → on relance.
      if (!stopped) {
        try {
          rec.start();
        } catch {
          /* déjà démarré */
        }
      }
    };

    try {
      rec.start();
    } catch {
      /* ignore */
    }

    return () => {
      stopped = true;
      if (armTimer) clearTimeout(armTimer);
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, paused, lang]);
}
