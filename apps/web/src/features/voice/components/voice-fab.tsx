"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, Check } from "lucide-react";
import { cn } from "@/utils/cn";
import { useParseTask } from "@/features/ai/api/parse-task";
import { useCreateTask } from "@/features/tasks/api/create-task";

type FabState = "idle" | "listening" | "processing" | "success" | "error";

// ── Web Speech API minimal typings ──────────────────────────────────────────

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
      | { [index: number]: { transcript: string } | undefined; isFinal: boolean; length: number }
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

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

async function checkMicPermission(): Promise<{ ok: boolean; error?: string }> {
  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (status.state === "granted") return { ok: true };
      if (status.state === "denied") {
        // Fallback: try getUserMedia anyway (localhost quirk)
        if (navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
            return { ok: true };
          } catch {
            // both failed
          }
        }
        return { ok: false, error: "Microphone access denied — allow it in your browser settings" };
      }
    } catch {
      // permissions API unavailable, fall through
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) return { ok: true };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : String(err);
    if (name === "NotAllowedError" || name === "PermissionDeniedError")
      return { ok: false, error: "Microphone access denied — allow it in your browser settings" };
    if (name === "NotFoundError" || name === "DevicesNotFoundError")
      return { ok: false, error: "No microphone found on this device" };
    return { ok: true };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function VoiceFab() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [fabState, setFabState] = useState<FabState>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parseTask = useParseTask();
  const createTask = useCreateTask();

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
    setFabState("error");
    setErrorMsg(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      setFabState("idle");
      setErrorMsg(null);
    }, 4000);
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setFabState("idle");
    setInterimText("");
  }, [clearSilenceTimer]);

  const startListening = useCallback(async () => {
    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionAPI) {
      showError("Speech recognition not supported in this browser");
      return;
    }

    const perm = await checkMicPermission();
    if (!perm.ok) {
      showError(perm.error ?? "Microphone unavailable");
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;  // keep listening until we call .stop()
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      let finalTranscript = "";

      recognition.onstart = () => {
        setFabState("listening");
        setInterimText("");
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
          if (result.isFinal) finalTranscript += alt.transcript;
          else interim += alt.transcript;
        }
        setInterimText(interim || finalTranscript);
        // Wait 4 s of silence before auto-stopping — gives users time to pause mid-sentence
        silenceTimerRef.current = setTimeout(() => {
          try { recognition.stop(); } catch { /* already stopped */ }
        }, 2500);
      };

      recognition.onend = () => {
        clearSilenceTimer();
        recognitionRef.current = null;
        setInterimText("");
        const text = finalTranscript.trim();
        if (!text) {
          setFabState("idle");
          return;
        }
        // Parse → create task
        setFabState("processing");
        parseTask.mutate(text, {
          onSuccess: (parsed) => {
            createTask.mutate(
              {
                title: parsed.title ?? text,
                category: parsed.category ?? "personal",
                subcategory: parsed.subcategory,
                priority: parsed.priority ?? "medium",
                dueDate: parsed.dueDate,
                tags: parsed.tags ?? [],
                notes: parsed.notes,
                subtasks: [],
                links: [],
              },
              {
                onSuccess: () => {
                  setFabState("success");
                  setTimeout(() => setFabState("idle"), 1500);
                },
                onError: () => showError("Couldn't save task — try again"),
              },
            );
          },
          onError: () => {
            // Fallback: create with just the title
            createTask.mutate(
              { title: text, category: "personal", priority: "medium", subtasks: [], tags: [], links: [] },
              {
                onSuccess: () => {
                  setFabState("success");
                  setTimeout(() => setFabState("idle"), 1500);
                },
                onError: () => showError("Couldn't save task — try again"),
              },
            );
          },
        });
      };

      recognition.onerror = (event: { error: string }) => {
        clearSilenceTimer();
        if (event.error === "aborted" || event.error === "no-speech") {
          setFabState("idle");
          setInterimText("");
          return;
        }
        showError(`Mic error: ${event.error}`);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start microphone";
      showError(msg);
    }
  }, [clearSilenceTimer, showError, parseTask, createTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, [clearSilenceTimer]);

  // Don't render until we know if speech is supported
  if (isSupported === null || !isSupported) return null;

  const isListening = fabState === "listening";
  const isProcessing = fabState === "processing";
  const isSuccess = fabState === "success";
  const hasError = fabState === "error";
  const showBubble = isListening || isProcessing || isSuccess || hasError;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
      {/* Status bubble */}
      {showBubble && (
        <div
          className={cn(
            "mb-1 rounded-xl border px-4 py-2 text-sm shadow-lg max-w-[220px] text-center animate-in fade-in slide-in-from-bottom-2 duration-200",
            hasError
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : isSuccess
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-border bg-background text-foreground",
          )}
        >
          {hasError
            ? (errorMsg ?? "Something went wrong")
            : isSuccess
              ? "Task created!"
              : isProcessing
                ? "Creating task…"
                : interimText
                  ? <span className="italic">{interimText}</span>
                  : "Listening…"}
        </div>
      )}

      {/* FAB button + label */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (isListening) stopListening();
            else void startListening();
          }}
          disabled={isProcessing || isSuccess}
          aria-label={isListening ? "Stop voice input" : "Add task by voice"}
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all duration-200",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
            isListening
              ? "bg-primary/90 text-white scale-110"
              : isProcessing || isSuccess
                ? "bg-primary/60 text-white"
                : hasError
                  ? "bg-destructive text-white"
                  : "bg-primary text-white hover:bg-primary/90 hover:scale-105 active:scale-95",
          )}
        >
          {isProcessing ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : isSuccess ? (
            <Check className="h-7 w-7" />
          ) : isListening ? (
            <MicOff className="h-7 w-7" />
          ) : (
            <Mic className="h-7 w-7" />
          )}

          {/* Pulse ring when listening */}
          {isListening && (
            <span className="absolute h-16 w-16 rounded-full border-2 border-primary animate-ping opacity-40" />
          )}
        </button>

        {/* Visible label */}
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap select-none">
          {isListening ? "Tap to stop" : isProcessing ? "Creating…" : isSuccess ? "Done!" : "Add Task"}
        </span>
      </div>
    </div>
  );
}
