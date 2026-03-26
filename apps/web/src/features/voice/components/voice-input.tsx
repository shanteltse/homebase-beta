"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

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
  // Prefer the unprefixed standard API; fall back to webkit prefix (Chrome/Safari)
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Prime Chrome's internal microphone permission gate by calling getUserMedia
 * briefly, then immediately releasing the stream.
 *
 * Chrome's Web Speech API has an internal permission check that is separate
 * from the browser-level microphone permission. Without this call, Chrome can
 * fire onerror("not-allowed") even when the user has already granted mic
 * access in browser settings. This is a well-documented Chrome quirk.
 */
async function primeMicrophonePermission(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.warn("[VoiceInput] getUserMedia not available — skipping prime");
    return { ok: true }; // let Speech API try on its own
  }
  try {
    console.log("[VoiceInput] Priming mic permission via getUserMedia…");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Release all tracks immediately — we only needed the permission handshake
    stream.getTracks().forEach((t) => t.stop());
    console.log("[VoiceInput] getUserMedia succeeded — mic permission confirmed");
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : String(err);
    console.error("[VoiceInput] getUserMedia failed:", name, err);
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        ok: false,
        error: "Microphone access denied — click the lock icon in your address bar to allow it",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return { ok: false, error: "No microphone found on this device" };
    }
    // Any other getUserMedia error — still let Speech API attempt
    console.warn("[VoiceInput] Non-blocking getUserMedia error:", name);
    return { ok: true };
  }
}

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone permission denied — allow it in your browser settings",
  "audio-capture": "No microphone found on this device",
  network: "Network error — speech recognition requires internet access",
  "service-not-allowed": "Speech service blocked — try reloading the page",
  "bad-grammar": "Grammar error in recognition config",
};

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
    const supported = getSpeechRecognitionConstructor() !== null;
    console.log("[VoiceInput] Browser speech recognition supported:", supported);
    setIsSupported(supported);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const showError = useCallback((msg: string) => {
    console.error("[VoiceInput] Showing error to user:", msg);
    setState("error");
    setErrorMessage(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      setState("idle");
      setErrorMessage(null);
    }, 5000);
  }, []);

  const stopListening = useCallback(() => {
    console.log("[VoiceInput] stopListening called");
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("[VoiceInput] .stop() threw (usually harmless):", e);
      }
      recognitionRef.current = null;
    }
    setState("idle");
    setInterimText("");
  }, [clearSilenceTimer]);

  const startListening = useCallback(async () => {
    console.log("[VoiceInput] startListening called");

    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionAPI) {
      showError("Speech recognition is not supported in this browser");
      return;
    }

    // Step 1: Prime Chrome's internal mic permission gate via getUserMedia.
    // This must complete before we create the SpeechRecognition instance.
    const primeResult = await primeMicrophonePermission();
    if (!primeResult.ok) {
      showError(primeResult.error ?? "Microphone unavailable");
      return;
    }

    // Step 2: Create recognition instance and wire up handlers
    try {
      console.log("[VoiceInput] Creating SpeechRecognition instance…");
      const recognition = new SpeechRecognitionAPI();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      let finalTranscript = "";

      recognition.onstart = () => {
        console.log("[VoiceInput] ✓ onstart — recording");
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
            console.log("[VoiceInput] Final segment:", JSON.stringify(alt.transcript));
          } else {
            interim += alt.transcript;
          }
        }

        setInterimText(interim || finalTranscript);

        // Auto-stop after 2.5 s of silence
        silenceTimerRef.current = setTimeout(() => {
          console.log("[VoiceInput] Silence timeout — stopping");
          try {
            recognition.stop();
          } catch {
            // already stopped
          }
        }, 2500);
      };

      recognition.onend = () => {
        console.log("[VoiceInput] onend — final transcript:", JSON.stringify(finalTranscript));
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
        console.error("[VoiceInput] onerror code:", event.error);
        clearSilenceTimer();

        if (event.error === "aborted" || event.error === "no-speech") {
          // Non-fatal — user stopped or said nothing
          setState("idle");
          setInterimText("");
          return;
        }

        const msg =
          SPEECH_ERROR_MESSAGES[event.error] ??
          `Speech error: ${event.error}`;
        showError(msg);
        setInterimText("");
      };

      recognitionRef.current = recognition;

      // Step 3: Start — wrapped in its own try/catch because start() can throw
      // synchronously on some browser/OS combinations
      console.log("[VoiceInput] Calling recognition.start()…");
      recognition.start();
      console.log("[VoiceInput] recognition.start() returned (async result via onstart/onerror)");
    } catch (err) {
      console.error("[VoiceInput] Exception during recognition setup/start:", err);
      const msg =
        err instanceof DOMException
          ? `Browser error: ${err.name} — ${err.message}`
          : err instanceof Error
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
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
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
          console.log("[VoiceInput] Button clicked — current state:", state);
          if (isListening) {
            stopListening();
          } else {
            void startListening();
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
            "w-max max-w-xs rounded-lg border px-3 py-1.5 shadow-sm text-xs whitespace-nowrap",
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
