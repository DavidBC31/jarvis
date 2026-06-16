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
  onerror: (() => void) | null;
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
  startListening: (onResult: (transcript: string) => void) => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeak: () => void;
}

export function useVoice(lang = "fr-FR"): VoiceApi {
  const [listening, setListening] = useState(false);
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
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) onResult(transcript.trim());
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
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

  return { sttSupported, ttsSupported, listening, startListening, stopListening, speak, cancelSpeak };
}
