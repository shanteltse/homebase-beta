"use client";

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Sparkles, Check, Pencil, X, Loader2, Mic, MicOff, Trash2, Plus } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { useParseTask, type ParsedTask, type ParseTaskResult } from "../api/parse-task";
import { useCreateTask } from "@/features/tasks/api/create-task";
import { useUpdateTask } from "@/features/tasks/api/update-task";
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
  const [tasksPreview, setTasksPreview] = useState<ParsedTask[] | null>(null);
  const [isInlineMicListening, setIsInlineMicListening] = useState(false);
  const parseTask = useParseTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inlineRecognitionRef = useRef<InlineSpeechRecognition | null>(null);

  function handleParseResult(result: ParseTaskResult) {
    if (result.type === "multi") {
      setPreview(null);
      setTasksPreview(result.tasks);
    } else {
      setTasksPreview(null);
      setPreview(result.task);
    }
  }

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
      setTasksPreview(null);
      // Auto-trigger AI parse
      parseTask.mutate(trimmed, {
        onSuccess: handleParseResult,
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
      handleAccept();
      return;
    }

    if (tasksPreview) {
      return;
    }

    // Enter = Quick Add
    handleFallbackCreate(trimmed);
  }

  function handleSmartAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    parseTask.mutate(trimmed, {
      onSuccess: handleParseResult,
      onError: () => handleFallbackCreate(trimmed),
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

  function handleDismissMulti() {
    setTasksPreview(null);
  }

  function handleRemoveTaskFromPreview(index: number) {
    setTasksPreview((prev) => prev?.filter((_, i) => i !== index) ?? null);
  }

  async function handleAddAllTasks() {
    if (!tasksPreview || tasksPreview.length === 0) return;
    try {
      for (const task of tasksPreview) {
        await createTask.mutateAsync({
          title: task.title ?? text.trim(),
          category: task.category ?? "personal",
          subcategory: task.subcategory,
          priority: task.priority ?? "medium",
          dueDate: task.dueDate,
          tags: task.tags ?? [],
          notes: task.notes,
          subtasks: [],
          links: [],
        });
      }
      setText("");
      setTasksPreview(null);
    } catch {
      // createTask error state is surfaced via createTask.isError
    }
  }

  function handleFallbackCreate(title: string) {
    const inputText = text;
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
        onSuccess: (created) => {
          setText("");
          setPreview(null);
          // Silently parse in the background and patch the task with AI fields
          parseTask.mutate(inputText, {
            onSuccess: (result) => {
              const parsed = result.type === "single" ? result.task : result.tasks[0];
              if (!parsed) return;
              const patch: Record<string, unknown> = { id: created.id };
              if (parsed.category) patch.category = parsed.category;
              if (parsed.subcategory) patch.subcategory = parsed.subcategory;
              if (parsed.priority) patch.priority = parsed.priority;
              if (parsed.dueDate) patch.dueDate = parsed.dueDate;
              if (parsed.tags?.length) patch.tags = parsed.tags;
              if (parsed.notes) patch.notes = parsed.notes;
              updateTask.mutate(patch as Parameters<typeof updateTask.mutate>[0]);
            },
            // Errors swallowed — task stays as created
          });
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

  // Auto-focus the input when the single preview appears so pressing Enter accepts
  useEffect(() => {
    if (preview) inputRef.current?.focus();
  }, [preview]);

  const isProcessing = parseTask.isPending || createTask.isPending;
  const taskCount = tasksPreview?.length ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border-2 border-primary/25 bg-background shadow-sm hover:border-primary/40 focus-within:border-primary/50 focus-within:shadow-md transition-all duration-200 p-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest select-none">Add a Task</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            ref={inputRef}
            placeholder="e.g. dentist appointment next Tuesday 3pm high priority"
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              if (preview) setPreview(null);
              if (tasksPreview) setTasksPreview(null);
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            disabled={isProcessing || isInlineMicListening}
            className={cn(
              "w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "pr-9 leading-normal",
            )}
          />
          {getInlineSpeechAPI() && (
            <button
              type="button"
              onClick={handleInlineMicClick}
              disabled={isProcessing}
              aria-label={isInlineMicListening ? "Stop listening" : "Dictate task"}
              title={isInlineMicListening ? "Stop listening" : "Dictate task"}
              className={cn(
                "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                isInlineMicListening
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isInlineMicListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <div className="flex gap-1.5 justify-end">
          <Button
            type="button"
            onClick={() => { const trimmed = text.trim(); if (trimmed) handleFallbackCreate(trimmed); }}
            disabled={isProcessing || !text.trim()}
            variant="outline"
            title="Quick Add — create task instantly without AI (Shift+Enter)"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
          <Button
            type="button"
            onClick={handleSmartAdd}
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
        </div>
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

      {/* Multi-task preview */}
      {tasksPreview && tasksPreview.length > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="body-sm font-medium text-foreground">
              {taskCount} task{taskCount !== 1 ? "s" : ""} detected
            </p>
            <button
              type="button"
              onClick={handleDismissMulti}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {tasksPreview.map((task, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md border border-border bg-background p-2.5"
              >
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  <p className="body-sm font-medium text-foreground leading-snug">
                    {task.title ?? text.trim()}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {task.category && (
                      <Badge variant="secondary">{getCategoryName(task.category)}</Badge>
                    )}
                    {task.subcategory && task.category && (
                      <Badge variant="outline">
                        {getSubcategoryName(task.category, task.subcategory)}
                      </Badge>
                    )}
                    {task.priority && (
                      <Badge
                        variant={
                          task.priority === "high"
                            ? "destructive"
                            : task.priority === "low"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {task.priority}
                      </Badge>
                    )}
                    {task.dueDate && (
                      <Badge variant="outline">
                        {new Date(task.dueDate).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </Badge>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTaskFromPreview(i)}
                  disabled={createTask.isPending}
                  className="shrink-0 text-muted-foreground/60 hover:text-destructive transition-colors disabled:opacity-40"
                  aria-label="Remove task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={handleAddAllTasks}
              disabled={createTask.isPending || tasksPreview.length === 0}
              className="gap-1.5"
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Add {taskCount} task{taskCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismissMulti}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {parseTask.isError && !preview && !tasksPreview && (
        <p className="caption text-destructive">
          AI parsing failed. Task was created with defaults.
        </p>
      )}
    </div>
  );
});
