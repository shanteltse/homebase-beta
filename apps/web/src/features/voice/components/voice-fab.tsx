"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, Check } from "lucide-react";
import { cn } from "@/utils/cn";
import { usePathname } from "next/navigation";
import { useParseTask } from "@/features/ai/api/parse-task";
import { useCreateTask } from "@/features/tasks/api/create-task";
import { MIC_PREF_KEY, MIC_DENIED_EVENT, MIC_GRANTED_EVENT } from "./mic-permission-banner";
import type { PluginListenerHandle } from "@capacitor/core";

type FabState = "idle" | "requesting" | "listening" | "processing" | "success" | "error";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VoiceFab() {
  const pathname = usePathname();
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [fabState, setFabState] = useState<FabState>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Web Speech API
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Native Speech Recognition (Capacitor)
  const nativeFinalTextRef = useRef("");
  const nativePartialListenerRef = useRef<PluginListenerHandle | null>(null);
  const nativeStateListenerRef = useRef<PluginListenerHandle | null>(null);

  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parseTask = useParseTask();
  const createTask = useCreateTask();

  useEffect(() => {
    if (isNative()) {
      setIsSupported(true);
    } else {
      setIsSupported(getSpeechRecognitionConstructor() !== null);
    }
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

  // Shared: parse text → create task
  const processTranscript = useCallback(
    (text: string) => {
      if (!text) {
        setFabState("idle");
        return;
      }
      setFabState("processing");
      parseTask.mutate(text, {
        onSuccess: (parsed) => {
          let taskInput: Parameters<typeof createTask.mutate>[0];
          if (parsed.type === "single") {
            taskInput = {
              title: parsed.task.title ?? text,
              category: parsed.task.category ?? "personal",
              subcategory: parsed.task.subcategory,
              priority: parsed.task.priority ?? "medium",
              dueDate: parsed.task.dueDate,
              tags: parsed.task.tags ?? [],
              notes: parsed.task.notes,
              subtasks: [],
              links: [],
            };
          } else {
            const first = parsed.tasks[0];
            if (!first) { setFabState("idle"); return; }
            taskInput = {
              title: first.title ?? text,
              category: first.category ?? "personal",
              subcategory: first.subcategory,
              priority: first.priority ?? "medium",
              dueDate: first.dueDate,
              tags: first.tags ?? [],
              notes: first.notes,
              subtasks: [],
              links: [],
            };
          }
          createTask.mutate(taskInput, {
            onSuccess: () => { setFabState("success"); setTimeout(() => setFabState("idle"), 1500); },
            onError: () => showError("Couldn't save task — try again"),
          });
        },
        onError: () => {
          createTask.mutate(
            { title: text, category: "personal", priority: "medium", subtasks: [], tags: [], links: [] },
            {
              onSuccess: () => { setFabState("success"); setTimeout(() => setFabState("idle"), 1500); },
              onError: () => showError("Couldn't save task — try again"),
            },
          );
        },
      });
    },
    [parseTask, createTask, showError],
  );

  // ── Native path (Capacitor SpeechRecognition plugin) ─────────────────────

  const startNativeListening = useCallback(async () => {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");

    setFabState("requesting");

    try {
      // Request both speech recognition and microphone permissions
      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      if (speechRecognition !== "granted") {
        try { localStorage.setItem(MIC_PREF_KEY, "denied"); } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent(MIC_DENIED_EVENT));
        showError("Microphone permission denied");
        return;
      }

      try { localStorage.setItem(MIC_PREF_KEY, "granted"); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent(MIC_GRANTED_EVENT));

      nativeFinalTextRef.current = "";

      const partialHandle = await SpeechRecognition.addListener("partialResults", (data) => {
        const text = data.matches?.[0] ?? "";
        nativeFinalTextRef.current = text;
        setInterimText(text);
      });
      nativePartialListenerRef.current = partialHandle;

      // listeningState:stopped fires when iOS ends the session (silence or stop()).
      // Guard against double-fire: stop() and the recognition task's final result
      // can both emit "stopped" in quick succession.
      const stateHandle = await SpeechRecognition.addListener("listeningState", (data) => {
        if (data.status !== "stopped") return;
        if (!nativeStateListenerRef.current) return; // already cleaned up
        void partialHandle.remove();
        void stateHandle.remove();
        nativePartialListenerRef.current = null;
        nativeStateListenerRef.current = null;
        const text = nativeFinalTextRef.current.trim();
        nativeFinalTextRef.current = "";
        setInterimText("");
        processTranscript(text);
      });
      nativeStateListenerRef.current = stateHandle;

      setFabState("listening");
      setInterimText("");

      // start() resolves immediately when partialResults:true; results stream via events
      await SpeechRecognition.start({ language: "en-US", maxResults: 1, partialResults: true, popup: false });
    } catch (err) {
      void nativePartialListenerRef.current?.remove();
      void nativeStateListenerRef.current?.remove();
      nativePartialListenerRef.current = null;
      nativeStateListenerRef.current = null;
      setInterimText("");
      showError(err instanceof Error ? err.message : "Speech recognition failed");
    }
  }, [showError, processTranscript]);

  const stopNativeListening = useCallback(async () => {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    try {
      await SpeechRecognition.stop();
      // listeningState:stopped handler drives the state transition from here
    } catch { /* ignore — engine may already be stopped */ }
  }, []);

  // ── Web path (webkitSpeechRecognition) ───────────────────────────────────

  const startWebListening = useCallback(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionAPI) {
      showError("Speech recognition not supported in this browser");
      return;
    }

    const hadPrior = (() => { try { return localStorage.getItem(MIC_PREF_KEY); } catch { return null; } })();
    if (!hadPrior) setFabState("requesting");

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      let finalTranscript = "";

      recognition.onstart = () => {
        try { localStorage.setItem(MIC_PREF_KEY, "granted"); } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent(MIC_GRANTED_EVENT));
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
        silenceTimerRef.current = setTimeout(() => {
          try { recognition.stop(); } catch { /* already stopped */ }
        }, 2500);
      };

      recognition.onend = () => {
        clearSilenceTimer();
        recognitionRef.current = null;
        setInterimText("");
        processTranscript(finalTranscript.trim());
      };

      recognition.onerror = (event: { error: string }) => {
        clearSilenceTimer();
        if (event.error === "aborted" || event.error === "no-speech") {
          setFabState("idle");
          setInterimText("");
          return;
        }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          try { localStorage.setItem(MIC_PREF_KEY, "denied"); } catch { /* ignore */ }
          window.dispatchEvent(new CustomEvent(MIC_DENIED_EVENT));
          showError(`Mic error: ${event.error}`);
          setInterimText("");
          return;
        }
        showError(`Mic error: ${event.error}`);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to start microphone");
    }
  }, [clearSilenceTimer, showError, processTranscript]);

  // ── Unified start/stop ────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (isNative()) void startNativeListening();
    else startWebListening();
  }, [startNativeListening, startWebListening]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (isNative()) {
      void stopNativeListening();
    } else {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      setFabState("idle");
      setInterimText("");
    }
  }, [clearSilenceTimer, stopNativeListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      void nativePartialListenerRef.current?.remove();
      void nativeStateListenerRef.current?.remove();
    };
  }, [clearSilenceTimer]);

  if (isSupported === null || !isSupported) return null;
  if (pathname.startsWith("/tasks/")) return null;

  const isRequesting = fabState === "requesting";
  const isListening = fabState === "listening";
  const isProcessing = fabState === "processing";
  const isSuccess = fabState === "success";
  const hasError = fabState === "error";
  const showBubble = isRequesting || isListening || isProcessing || isSuccess || hasError;

  return (
    <div className="fixed right-[20px] z-50 flex flex-col items-center gap-2" style={{ bottom: "calc(max(env(safe-area-inset-bottom), 20px) + 85px)" }}>
      {showBubble && (
        <div
          className={cn(
            "rounded-xl border px-4 py-2 text-sm shadow-lg max-w-[220px] text-center animate-in fade-in slide-in-from-bottom-2 duration-200",
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
                : isRequesting
                  ? "Allow microphone when prompted…"
                  : interimText
                    ? <span className="italic">{interimText}</span>
                    : "Listening…"}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (isListening) stopListening();
            else startListening();
          }}
          disabled={isRequesting || isProcessing || isSuccess}
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

          {isListening && (
            <span className="absolute h-16 w-16 rounded-full border-2 border-primary animate-ping opacity-40" />
          )}
        </button>

        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap select-none">
          {isListening ? "Tap to stop" : isProcessing ? "Creating…" : isSuccess ? "Done!" : isRequesting ? "Waiting…" : "Add Task!"}
        </span>
      </div>
    </div>
  );
}
