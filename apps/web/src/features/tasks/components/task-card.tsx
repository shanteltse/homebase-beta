"use client";

import Link from "next/link";
import { Mail, Phone, Repeat, Star } from "lucide-react";
import { Checkbox } from "@repo/ui/checkbox";
import { Badge } from "@repo/ui/badge";
import { cn } from "@/utils/cn";
import type { Task } from "@/types/task";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { useHouseholdMembers } from "@/features/household/api/get-members";
import { MemberAvatar } from "@/features/household/components/member-avatar";

type TaskCardProps = {
  task: Task;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onToggleStar?: (taskId: string, starred: boolean) => void;
};

const PRIORITY_VARIANTS = {
  high: "high",
  medium: "medium",
  low: "low",
} as const;

const CATEGORY_VARIANTS: Record<string, "home" | "personal" | "work"> = {
  "family-home": "home",
  personal: "personal",
  "work-career": "work",
};

function isOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function getContactMeta(contact: string | null | undefined): { type: "email" | "phone"; href: string } | null {
  if (!contact) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))
    return { type: "email", href: `mailto:${contact}` };
  if (/^[+\d][\d\s\-().]{6,}$/.test(contact))
    return { type: "phone", href: `tel:${contact.replace(/\s/g, "")}` };
  return null;
}

export function TaskCard({ task, onToggleComplete, onToggleStar }: TaskCardProps) {
  const { data: members } = useHouseholdMembers();
  const assignedMember = task.assignee
    ? members?.find((m) => m.id === task.assignee)
    : undefined;

  const categoryName =
    DEFAULT_CATEGORIES.find((c) => c.id === task.category)?.name ??
    task.category;

  const overdue = isOverdue(task.dueDate);
  const contactMeta = getContactMeta(task.contact);

  return (
    <div
      data-testid="task-card"
      data-task-title={task.title}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50",
        task.completed && "opacity-60",
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) =>
          onToggleComplete(task.id, checked === true)
        }
        className="mt-0.5"
      />

      {onToggleStar && (
        <button
          onClick={() => onToggleStar(task.id, !task.starred)}
          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
          aria-label={task.starred ? "Unstar task" : "Star task"}
        >
          <Star
            className={cn("h-4 w-4", task.starred && "fill-primary text-primary")}
          />
        </button>
      )}

      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <Link
          href={`/tasks/${task.id}`}
          className={cn(
            "body font-medium text-foreground hover:text-primary",
            task.completed && "line-through",
          )}
        >
          {task.title}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={CATEGORY_VARIANTS[task.category] ?? "default"}>
            {categoryName}
          </Badge>
          <Badge variant={PRIORITY_VARIANTS[task.priority]}>
            {task.priority}
          </Badge>
          {task.dueDate && (
            <span
              className={cn(
                "caption flex items-center gap-1",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {overdue && "Overdue: "}
              {new Date(task.dueDate).toLocaleDateString()}
              {task.recurring && (
                <span title={`Repeats ${(task.recurring as { frequency: string }).frequency}`}>
                  <Repeat className="h-3 w-3" />
                </span>
              )}
            </span>
          )}
          {!task.dueDate && task.recurring && (
            <span
              className="caption flex items-center gap-1 text-muted-foreground"
              title={`Repeats ${(task.recurring as { frequency: string }).frequency}`}
            >
              <Repeat className="h-3 w-3" />
              {(task.recurring as { frequency: string }).frequency}
            </span>
          )}
          {task.tags.length > 0 &&
            task.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          {task.subtasks.length > 0 && (() => {
            const completed = task.subtasks.filter((s) => s.completed).length;
            const total = task.subtasks.length;
            const pct = Math.round((completed / total) * 100);
            return (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="caption text-muted-foreground">
                  {completed}/{total} subtasks
                </span>
              </div>
            );
          })()}
          {assignedMember && (
            <div className="flex items-center gap-1.5">
              <MemberAvatar
                name={assignedMember.name}
                image={assignedMember.image}
                size="sm"
              />
              <span className="caption text-muted-foreground">
                {assignedMember.name ?? assignedMember.email}
              </span>
            </div>
          )}
        </div>
      </div>

      {contactMeta && (
        <a
          href={contactMeta.href}
          aria-label={contactMeta.type === "email" ? `Email ${task.contact}` : `Call ${task.contact}`}
          title={task.contact ?? undefined}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0 text-muted-foreground/60 hover:text-primary transition-colors"
        >
          {contactMeta.type === "email"
            ? <Mail className="h-4 w-4" />
            : <Phone className="h-4 w-4" />}
        </a>
      )}
    </div>
  );
}
