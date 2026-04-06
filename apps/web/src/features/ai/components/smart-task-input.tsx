"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Sparkles, Check, Pencil, X, Loader2, Mic, MicOff } from "lucide-react";
import { Input } from "@repo/ui/input";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { useParseTask, type ParsedTask } from "../api/parse-task";
import { useCreateTask } from "@/features/tasks/api/create-task";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { cn } from "@/utils/cn";

// ── Minimal Speech API types (no global augmentation to avoid conflicts) ─────
type InlineSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: InlineSpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type InlineSpeechResultEvent = {
  resultIndex: number;
  results: {
    [index: number]: { [index: number]: { transcript: string } | undefined; isFinal: boolean; length: number } | undefined;
    length: number;
  };
};
function getInlineSpeechAPI(): (new () => InlineSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => InlineSpeechRecognition; webkitSpeechRecognition?: new () => InlineSpeechRecognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type SmartTaskInputProps = {
  onOpenCreateDialog?: (prefill: ParsedTask) => void;
};

export type SmartTaskInputHandle = { focus: () => void };

export const SmartTaskInput = forwardRef<SmartTaskInputHandle, SmartTaskInputProps>(
function SmartTaskInput({ onOpenCreateDialog }, ref) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedTask | null>(null);
  const [isInlineMicListening, setIsInlineMicListening] = useState(false);
  const parseTask = useParseTask();
  const createTask = useCreateTask();
  const inputRef = useRef<HTMLInputElement>(null);
  const inlineRecognitionRef = useRef<InlineSpeechRecognition | null>(null);

  function handleInlineMicClick() {
    if (isInlineMicListening) {
      inlineRecognitionRef.current?.stop();
      return;
    }
    const SpeechAPI = getInlineSpeechAPI();
    if (!SpeechAPI) return;

    const recognition = new SpeechAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let final = "";

    recognition.onstart = () => {
      setIsInlineMicListening(true);
      final = "";
    };

    recognition.onresult = (event: InlineSpeechResultEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) final += alt.transcript;
      }
      setText(final || text);
    };

    recognition.onend = () => {
      setIsInlineMicListening(false);
      inlineRecognitionRef.current = null;
      const trimmed = final.trim();
      if (!trimmed) return;
      setText(trimmed);
      setPreview(null);
      // Auto-trigger AI parse
      parseTask.mutate(trimmed, {
        onSuccess: (parsed) => setPreview(parsed),
        onError: () => handleFallbackCreate(trimmed),
      });
    };

    recognition.onerror = () => {
      setIsInlineMicListening(false);
      inlineRecognitionRef.current = null;
    };

    inlineRecognitionRef.current = recognition;
    recognition.start();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (preview) {
      // If preview is showing and user presses Enter again, accept it
      handleAccept();
      return;
    }

    // Try AI parsing
    parseTask.mutate(trimmed, {
      onSuccess: (parsed) => {
        setPreview(parsed);
      },
      onError: () => {
        // Fallback: create a simple task directly
        handleFallbackCreate(trimmed);
      },
    });
  }

  function handleAccept() {
    if (!preview) return;
    const payload = {
      title: preview.title ?? text.trim(),
      category: preview.category ?? "personal",
      subcategory: preview.subcategory,
      priority: preview.priority ?? "medium",
      dueDate: preview.dueDate,
      tags: preview.tags ?? [],
      notes: preview.notes,
      subtasks: [] as [],
      links: [] as [],
    };
    console.log("[SmartTaskInput] handleAccept — preview:", JSON.stringify(preview));
    console.log("[SmartTaskInput] handleAccept — dueDate in payload:", payload.dueDate ?? "(not present)");
    console.log("[SmartTaskInput] handleAccept — full payload:", JSON.stringify(payload));
    createTask.mutate(
      payload,
      {
        onSuccess: () => {
          setText("");
          setPreview(null);
        },
      },
    );
  }

  function handleEdit() {
    if (!preview || !onOpenCreateDialog) return;
    onOpenCreateDialog(preview);
    setPreview(null);
    setText("");
  }

  function handleDismiss() {
    setPreview(null);
  }

  function handleFallbackCreate(title: string) {
    createTask.mutate(
      {
        title,
        category: "personal",
        priority: "medium",
        subtasks: [],
        tags: [],
        links: [],
      },
      {
        onSuccess: () => {
          setText("");
          setPreview(null);
        },
      },
    );
  }

  function getCategoryName(id: string) {
    return DEFAULT_CATEGORIES.find((c) => c.id === id)?.name ?? id;
  }

  function getSubcategoryName(categoryId: string, subId: string) {
    const cat = DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
    return cat?.subcategories.find((s) => s.id === subId)?.name ?? subId;
  }

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  // Auto-focus the input when the preview appears so pressing Enter immediately accepts
  useEffect(() => {
    if (preview) {
      inputRef.current?.focus();
    }
  }, [preview]);

  const isProcessing = parseTask.isPending || createTask.isPending;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border-2 border-primary/25 bg-background shadow-sm hover:border-primary/40 focus-within:border-primary/50 focus-within:shadow-md transition-all duration-200 p-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest select-none">Add a Task</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="e.g. dentist appointment next Tuesday 3pm high priority"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (preview) setPreview(null);
            }}
            disabled={isProcessing || isInlineMicListening}
            className="pr-9"
          />
          {getInlineSpeechAPI() && (
            <button
              type="button"
              onClick={handleInlineMicClick}
              disabled={isProcessing}
              aria-label={isInlineMicListening ? "Stop listening" : "Dictate task"}
              title={isInlineMicListening ? "Stop listening" : "Dictate task"}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                isInlineMicListening
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isInlineMicListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={isProcessing || !text.trim()}
          variant="primary"
          className="gap-1.5"
        >
          {parseTask.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {parseTask.isPending ? "Parsing..." : "Smart Add"}
        </Button>
      </form>
      </div>

      {/* Preview card */}
      {preview && (
        <div
          className={cn(
            "rounded-lg border border-primary/40 bg-primary/5 p-4",
            "flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <p className="body-sm font-medium text-foreground">
                {preview.title ?? text.trim()}
              </p>
              {preview.notes && (
                <p className="caption text-muted-foreground">{preview.notes}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {preview.category && (
              <Badge variant="secondary">{getCategoryName(preview.category)}</Badge>
            )}
            {preview.subcategory && preview.category && (
              <Badge variant="outline">
                {getSubcategoryName(preview.category, preview.subcategory)}
              </Badge>
            )}
            {preview.priority && (
              <Badge
                variant={
                  preview.priority === "high"
                    ? "destructive"
                    : preview.priority === "low"
                      ? "outline"
                      : "secondary"
                }
              >
                {preview.priority}
              </Badge>
            )}
            {preview.dueDate && (
              <Badge variant="outline">
                {new Date(preview.dueDate).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Badge>
            )}
            {preview.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleAccept}
              disabled={createTask.isPending}
              className="gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {createTask.isPending ? "Adding..." : "Add Task"}
            </Button>
            {onOpenCreateDialog && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEdit}
                className="gap-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Dismiss
            </Button>
            <span className="ml-auto caption text-muted-foreground hidden sm:inline">
              ↵ Enter to add
            </span>
          </div>
        </div>
      )}

      {parseTask.isError && !preview && (
        <p className="caption text-destructive">
          AI parsing failed. Task was created with defaults.
        </p>
      )}
    </div>
  );
});
