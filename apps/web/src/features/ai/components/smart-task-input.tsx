"use client";

import { useState, useCallback, useRef } from "react";
import { Sparkles, Check, Pencil, X, Loader2 } from "lucide-react";
import { Input } from "@repo/ui/input";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { useParseTask, type ParsedTask } from "../api/parse-task";
import { useCreateTask } from "@/features/tasks/api/create-task";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { cn } from "@/utils/cn";
import { VoiceInput, useVoiceShortcut } from "@/features/voice/components/voice-input";

type SmartTaskInputProps = {
  onOpenCreateDialog?: (prefill: ParsedTask) => void;
};

export function SmartTaskInput({ onOpenCreateDialog }: SmartTaskInputProps) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ParsedTask | null>(null);
  const parseTask = useParseTask();
  const createTask = useCreateTask();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setText(transcript);
    setPreview(null);
    // Auto-trigger AI parsing after voice input
    parseTask.mutate(transcript, {
      onSuccess: (parsed) => setPreview(parsed),
      onError: () => handleFallbackCreate(transcript),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useVoiceShortcut(focusInput);

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
    createTask.mutate(
      {
        title: preview.title ?? text.trim(),
        category: preview.category ?? "personal",
        subcategory: preview.subcategory,
        priority: preview.priority ?? "medium",
        dueDate: preview.dueDate,
        tags: preview.tags ?? [],
        notes: preview.notes,
        subtasks: [],
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

  const isProcessing = parseTask.isPending || createTask.isPending;

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Describe a task... e.g. &quot;dentist appointment next Tuesday 3pm high priority&quot;"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (preview) setPreview(null);
            }}
            disabled={isProcessing}
            className="pr-10"
          />
        </div>
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          disabled={isProcessing}
        />
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

      {/* Preview card */}
      {preview && (
        <div
          className={cn(
            "rounded-lg border border-border bg-muted/50 p-4",
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
              onClick={handleAccept}
              disabled={createTask.isPending}
              className="gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              {createTask.isPending ? "Creating..." : "Accept"}
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
}
