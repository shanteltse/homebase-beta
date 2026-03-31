"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { MIC_PREF_KEY, MIC_DENIED_EVENT, MIC_GRANTED_EVENT } from "./mic-permission-banner";

type VoiceInputState = "idle" | "listening" | "processing" | "error";

type VoiceInputProps = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  language?: string;
  className?: string;
};

// Minimal Web Speech API typings (not in all TS lib versions)
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    [index: number]:
      | {
          [index: number]: { transcript: string } | undefined;
          isFinal: boolean;
          length: number;
        }
      | undefined;
    length: number;
  };
};

declare global {
  interface Window {
    SpeechRecognition: (new () => SpeechRecognitionInstance) | undefined;
    webkitSpeechRecognition: (new () => SpeechRecognitionInstance) | undefined;
  }
}

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function VoiceInput({
  onTranscript,
  disabled = false,
  language = "en-US",
  className,
}: VoiceInputProps) {
  const [state, setState] = useState<VoiceInputState>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect API support client-side only (avoids SSR mismatch)
  useEffect(() => {
    setIsSupported(getSpeechRecognitionConstructor() !== null);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const showError = useCallback((msg: string) => {
    setState("error");
    setErrorMessage(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      setState("idle");
      setErrorMessage(null);
    }, 4000);
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setState("idle");
    setInterimText("");
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionAPI) {
      showError("Speech recognition is not supported in this browser");
      return;
    }

    // Do NOT call getUserMedia / navigator.permissions.query here.
    // On iOS PWA, that triggers a second OS permission dialog before
    // SpeechRecognition's own prompt, causing two prompts per session.
    // Let SpeechRecognition handle permission natively; onerror surfaces denials.

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      let finalTranscript = "";

      recognition.onstart = () => {
        // Record that the user granted mic access; notify the app-level banner
        try { localStorage.setItem(MIC_PREF_KEY, "granted"); } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent(MIC_GRANTED_EVENT));
        setState("listening");
        setInterimText("");
        setErrorMessage(null);
        finalTranscript = "";
      };

      recognition.onresult = (event: SpeechRecognitionResultEvent) => {
        clearSilenceTimer();
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;
          const alt = result[0];
          if (!alt) continue;
          if (result.isFinal) {
            finalTranscript += alt.transcript;
          } else {
            interim += alt.transcript;
          }
        }

        setInterimText(interim || finalTranscript);

        // Auto-stop after 2.5 s of silence
        silenceTimerRef.current = setTimeout(() => {
          try { recognition.stop(); } catch { /* already stopped */ }
        }, 2500);
      };

      recognition.onend = () => {
        clearSilenceTimer();
        recognitionRef.current = null;
        setState("idle");
        setInterimText("");
        const text = finalTranscript.trim();
        if (text) {
          setState("processing");
          onTranscript(text);
          setTimeout(() => setState("idle"), 300);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        clearSilenceTimer();

        if (event.error === "aborted" || event.error === "no-speech") {
          // Non-fatal — user stopped or said nothing
          setState("idle");
          setInterimText("");
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          // Record denial; dispatch event so the app-level banner shows
          try { localStorage.setItem(MIC_PREF_KEY, "denied"); } catch { /* ignore */ }
          window.dispatchEvent(new CustomEvent(MIC_DENIED_EVENT));
          showError(
            "Tap the mic to enable voice input — you may need to allow microphone access in Safari",
          );
          setInterimText("");
          return;
        }

        if (event.error === "audio-capture") {
          showError("No microphone found on this device");
          return;
        }

        showError(`Speech error: ${event.error}`);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to start microphone — try reloading the page";
      showError(msg);
    }
  }, [language, onTranscript, clearSilenceTimer, showError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, [clearSilenceTimer]);

  // Render a same-size placeholder while we detect support (avoids layout shift)
  if (isSupported === null) {
    return <div className={cn("h-9 w-9 shrink-0", className)} />;
  }

  if (!isSupported) return null;

  const isListening = state === "listening";
  const isProcessing = state === "processing";
  const hasError = state === "error";

  return (
    <div className="relative flex flex-col items-center shrink-0">
      <button
        type="button"
        onClick={() => {
          if (isListening) {
            stopListening();
          } else {
            startListening();
          }
        }}
        disabled={disabled || isProcessing}
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        title={
          hasError
            ? (errorMessage ?? "Error — click to retry")
            : isListening
              ? "Tap to stop"
              : "Voice input (Cmd+Shift+V)"
        }
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border transition-all",
          isListening &&
            "border-primary bg-primary/10 text-primary shadow-md",
          isProcessing && "border-border bg-muted text-muted-foreground",
          hasError && "border-destructive bg-destructive/10 text-destructive",
          !isListening &&
            !isProcessing &&
            !hasError &&
            "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}

        {isListening && (
          <span className="absolute inset-0 rounded-full border border-primary opacity-50 animate-ping" />
        )}
      </button>

      {/* Status / error message above the button */}
      {(isListening || hasError) && (
        <div
          className={cn(
            "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10",
            "w-max max-w-xs rounded-lg border px-3 py-1.5 shadow-sm text-xs",
            hasError
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-popover text-muted-foreground",
          )}
        >
          {hasError
            ? (errorMessage ?? "Couldn't hear you — try again")
            : interimText
              ? <span className="italic">{interimText}</span>
              : "Listening…"}
        </div>
      )}
    </div>
  );
}

// Global keyboard shortcut hook for voice input
export function useVoiceShortcut(onActivate: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "V") {
        e.preventDefault();
        onActivate();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onActivate]);
}
