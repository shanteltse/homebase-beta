"use client";

import { useState } from "react";
import { Upload, X, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/dialog";
import { Badge } from "@repo/ui/badge";
import { cn } from "@/utils/cn";
import { useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/task";
import type { ImportedTask } from "@/app/api/ai/import-tasks/route";
import { useHouseholdMembers } from "@/features/household/api/get-members";

type ImportState = "idle" | "parsing" | "preview" | "importing" | "done";

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRIORITY_VARIANTS = {
  high: "high",
  medium: "medium",
  low: "low",
} as const;

export function ImportTasksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [importState, setImportState] = useState<ImportState>("idle");
  const [rawText, setRawText] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ImportedTask[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const queryClient = useQueryClient();
  const { data: members } = useHouseholdMembers();

  function handleClose() {
    if (importState === "importing") return;
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setImportState("idle");
      setRawText("");
      setParsedTasks([]);
      setErrorMsg(null);
    }, 200);
  }

  async function handleParse() {
    const text = rawText.trim();
    if (!text) return;
    setImportState("parsing");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai/import-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Parse failed");
      }
      const data = (await res.json()) as { tasks: ImportedTask[] };
      if (data.tasks.length === 0) {
        setErrorMsg("No tasks found — try a different format or add more detail.");
        setImportState("idle");
        return;
      }
      setParsedTasks(data.tasks);
      setImportState("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setImportState("idle");
    }
  }

  function removeTask(index: number) {
    setParsedTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleImport() {
    if (parsedTasks.length === 0) return;
    setImportState("importing");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/tasks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: parsedTasks.map((t) => ({
            title: t.title,
            category: t.category,
            priority: t.priority,
            ...(t.dueDate ? { dueDate: t.dueDate } : {}),
            ...(t.assignee ? { assignee: t.assignee } : {}),
            ...(t.notes ? { notes: t.notes } : {}),
            subtasks: [],
            tags: [],
            links: [],
          })),
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = (await res.json()) as { created: Task[] };
      // Prepend all imported tasks into the React Query cache
      queryClient.setQueryData<Task[]>(["tasks"], (existing) => {
        const newTasks = data.created;
        return existing ? [...newTasks, ...existing] : newTasks;
      });
      setImportedCount(data.created.length);
      setImportState("done");
    } catch {
      setErrorMsg("Failed to import tasks. Please try again.");
      setImportState("preview");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import your to-do list
          </DialogTitle>
          <DialogDescription>
            Paste your list in any format — numbered, bulleted, or plain text. We&apos;ll sort it out.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          {/* Done state */}
          {importState === "done" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  {importedCount} task{importedCount !== 1 ? "s" : ""} imported!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  They&apos;ve been added to your task list.
                </p>
              </div>
              <Button variant="primary" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}

          {/* Idle: paste input */}
          {(importState === "idle" || importState === "parsing") && (
            <>
              <textarea
                className={cn(
                  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground",
                  "placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                  "min-h-[200px]",
                )}
                placeholder={`Paste your to-do list here — any format works:\n\n1. Schedule dentist appointment\n2. Buy groceries (milk, eggs, bread)\n- Call the landlord about the leak\n- Book flights for July vacation by end of month\nPick up dry cleaning\nHigh priority: Submit quarterly report by Friday`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                disabled={importState === "parsing"}
              />

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleParse}
                  disabled={!rawText.trim() || importState === "parsing"}
                  className="gap-2"
                >
                  {importState === "parsing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing your list…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Parse my list
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Preview state */}
          {(importState === "preview" || importState === "importing") && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {parsedTasks.length} task{parsedTasks.length !== 1 ? "s" : ""} found
                  <span className="text-muted-foreground font-normal"> — remove any you don&apos;t want</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setImportState("idle");
                    setParsedTasks([]);
                    setErrorMsg(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Start over
                </button>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh]">
                {parsedTasks.map((task, i) => {
                  const assignedMember = task.assignee
                    ? members?.find((m) => m.id === task.assignee)
                    : undefined;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={PRIORITY_VARIANTS[task.priority] ?? "default"}>
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {assignedMember && (
                            <span className="text-xs text-muted-foreground">
                              → {assignedMember.name ?? assignedMember.email}
                            </span>
                          )}
                          {task.notes && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                              {task.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTask(i)}
                        disabled={importState === "importing"}
                        className="shrink-0 text-muted-foreground/60 hover:text-destructive transition-colors disabled:opacity-40"
                        aria-label="Remove task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {parsedTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All tasks removed.
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={importState === "importing"}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={parsedTasks.length === 0 || importState === "importing"}
                  className="gap-2"
                >
                  {importState === "importing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Import {parsedTasks.length} task{parsedTasks.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
