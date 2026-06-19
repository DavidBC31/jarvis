import { useCallback, useEffect, useRef, useState } from "react";

// Reconnaissance/synthèse vocale via la Web Speech API du navigateur.
// Aucune dépendance serveur — idéal pour un kiosque Chrome. Dégrade proprement
// (`supported === false`) si l'API n'est pas disponible : la saisie texte reste.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
export type { SpeechRecognitionLike };

export function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface VoiceApi {
  sttSupported: boolean;
  ttsSupported: boolean;
  listening: boolean;
  error: string | null; // message lisible du dernier échec (diagnostic UI)
  startListening: (onResult: (transcript: string) => void) => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeak: () => void;
}

// Traduit le code d'erreur brut de la Web Speech API en message exploitable.
function errorMessage(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Accès micro refusé. Clique sur le 🔒 dans la barre d'adresse → Micro → Autoriser, puis recharge.";
    case "audio-capture":
      return "Aucun micro détecté par le navigateur.";
    case "network":
      return "Service de reconnaissance Google injoignable (réseau/pare-feu).";
    case "no-speech":
      return "Rien entendu — parle juste après le clic.";
    case "aborted":
      return null; // interruption normale (stop manuel, autre reco) : pas une erreur à afficher
    default:
      return `Erreur reconnaissance : ${code}`;
  }
}

export function useVoice(lang = "fr-FR"): VoiceApi {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const sttSupported = typeof window !== "undefined" && getRecognitionCtor() !== null;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(
    (onResult: (transcript: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      // Coupe une éventuelle reconnaissance précédente (Chrome n'en autorise qu'une).
      recognitionRef.current?.abort?.();
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = false;
      // Suivi de session : distingue « rien capté » d'une vraie erreur.
      let gotResult = false;
      let errored = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) {
          gotResult = true;
          onResult(transcript.trim());
        }
      };
      rec.onerror = (e) => {
        const code = (e && e.error) || "unknown";
        errored = true;
        // eslint-disable-next-line no-console
        console.warn("[voice] erreur reconnaissance:", code);
        const msg = errorMessage(code);
        if (msg) setError(msg);
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
        // START suivi de END sans résultat ni erreur = audio silencieux : sur un
        // poste sans micro (ex. Mac Studio), Chrome « ouvre » une entrée vide.
        if (!gotResult && !errored) {
          setError("Aucune parole captée. Vérifie qu'un micro est branché et non coupé (le Mac Studio n'a pas de micro intégré).");
        }
      };
      recognitionRef.current = rec;
      setError(null);
      setListening(true);
      try {
        rec.start();
      } catch (e) {
        // InvalidStateError si une reco est déjà active : on le rend visible.
        setError("Le micro est déjà en cours d'initialisation — réessaie dans 1 s.");
        setListening(false);
        // eslint-disable-next-line no-console
        console.warn("[voice] start() a échoué:", e);
      }
    },
    [lang],
  );

  const cancelSpeak = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
  }, [ttsSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      const frVoice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.toLowerCase().startsWith("fr"));
      if (frVoice) u.voice = frVoice;
      window.speechSynthesis.speak(u);
    },
    [lang, ttsSupported],
  );

  // Stoppe tout au démontage.
  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (ttsSupported) window.speechSynthesis.cancel();
  }, [ttsSupported]);

  return { sttSupported, ttsSupported, listening, error, startListening, stopListening, speak, cancelSpeak };
}
