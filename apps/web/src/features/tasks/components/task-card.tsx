"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, Mail, Phone, Repeat, Star, UserRound } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import type { Task } from "@/types/task";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { useHouseholdMembers } from "@/features/household/api/get-members";
import { useUpdateTask } from "@/features/tasks/api/update-task";
import { MemberAvatar } from "@/features/household/components/member-avatar";

type TaskCardProps = {
  task: Task;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onToggleStar?: (taskId: string, starred: boolean) => void;
  onTagClick?: (tag: string) => void;
};

type OpenDropdown = "category" | "priority" | "assignee" | null;

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

export function TaskCard({ task, onToggleComplete, onToggleStar, onTagClick }: TaskCardProps) {
  const { data: members } = useHouseholdMembers();
  const updateTask = useUpdateTask();
  const assignedMember = task.assignee
    ? members?.find((m) => m.id === task.assignee)
    : undefined;
  const showAssignIcon = members && members.length > 1;

  const categoryName =
    DEFAULT_CATEGORIES.find((c) => c.id === task.category)?.name ??
    task.category;

  const overdue = isOverdue(task.dueDate);
  const contactMeta = getContactMeta(task.contact);

  // Shared controlled state for inline edit dropdowns.
  // Only one can be open at a time — setting a new one automatically closes the previous.
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

  function toggleDropdown(name: OpenDropdown) {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }

  return (
    <div
      data-testid="task-card"
      data-task-title={task.title}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50",
        task.completed && "opacity-60",
      )}
    >
      {onToggleStar && (
        <button
          onClick={() => onToggleStar(task.id, !task.starred)}
          className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
          title={task.starred ? "Remove from today's focus" : "Focus on this today"}
          aria-label={task.starred ? "Remove from today's focus" : "Focus on this today"}
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
            "body block font-medium text-foreground hover:text-primary break-words",
            task.completed && "line-through",
            task.starred && "font-bold",
          )}
        >
          {task.title}
        </Link>


        <div className="flex flex-wrap items-center gap-2">
          {/* Category — controlled dropdown, modal={false} so no overlay blocks sibling triggers */}
          <DropdownMenu
            open={openDropdown === "category"}
            onOpenChange={(open) => { if (!open) setOpenDropdown(null); }}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("category"); }}
              >
                <Badge variant={CATEGORY_VARIANTS[task.category] ?? "default"}>
                  {categoryName}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onInteractOutside={() => setOpenDropdown(null)}>
              {DEFAULT_CATEGORIES.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() => { updateTask.mutate({ id: task.id, category: cat.id }); setOpenDropdown(null); }}
                  className={cn("flex items-center justify-between gap-4", task.category === cat.id && "font-medium")}
                >
                  {cat.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority — controlled dropdown */}
          <DropdownMenu
            open={openDropdown === "priority"}
            onOpenChange={(open) => { if (!open) setOpenDropdown(null); }}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("priority"); }}
              >
                <Badge variant={PRIORITY_VARIANTS[task.priority]}>
                  {task.priority}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onInteractOutside={() => setOpenDropdown(null)}>
              {(["high", "medium", "low"] as const).map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => { updateTask.mutate({ id: task.id, priority: p }); setOpenDropdown(null); }}
                  className={cn("flex items-center justify-between gap-4", task.priority === p && "font-medium")}
                >
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Due date — overlay <input type="date"> on the visual trigger so the native
              picker opens on direct tap (works on iOS Safari; showPicker() does not). */}
          {task.dueDate ? (
            <label
              key={task.dueDate}
              className={cn(
                "caption relative flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {overdue && "Overdue: "}
              {/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
                ? new Date(task.dueDate + "T12:00:00").toLocaleDateString()
                : new Date(task.dueDate).toLocaleDateString()}
              {task.recurring && (
                <span title={`Repeats ${(task.recurring as { frequency: string }).frequency}`}>
                  <Repeat className="h-3 w-3" />
                </span>
              )}
              <input
                type="date"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}
                onChange={(e) => { if (e.target.value) updateTask.mutate({ id: task.id, dueDate: e.target.value }); }}
                tabIndex={-1}
              />
            </label>
          ) : (
            <>
              {task.recurring && (
                <span
                  className="caption flex items-center gap-1 text-muted-foreground"
                  title={`Repeats ${(task.recurring as { frequency: string }).frequency}`}
                >
                  <Repeat className="h-3 w-3" />
                  {(task.recurring as { frequency: string }).frequency}
                </span>
              )}
              <label
                title="Add due date"
                aria-label="Add due date"
                className="relative cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
                <input
                  type="date"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}
                  onChange={(e) => { if (e.target.value) updateTask.mutate({ id: task.id, dueDate: e.target.value }); }}
                  tabIndex={-1}
                />
              </label>
            </>
          )}

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

          {/* Assignee — controlled dropdown */}
          {showAssignIcon && (
            <DropdownMenu
              open={openDropdown === "assignee"}
              onOpenChange={(open) => { if (!open) setOpenDropdown(null); }}
              modal={false}
            >
              <DropdownMenuTrigger asChild>
                {assignedMember ? (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("assignee"); }}
                    className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                  >
                    <MemberAvatar name={assignedMember.name} image={assignedMember.image} size="sm" />
                    <span className="caption text-muted-foreground">
                      {assignedMember.name ?? assignedMember.email}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Assign to member"
                    aria-label="Assign to member"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("assignee"); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <UserRound className="h-4 w-4" />
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onInteractOutside={() => setOpenDropdown(null)}>
                {assignedMember && (
                  <DropdownMenuItem onClick={() => { updateTask.mutate({ id: task.id, assignee: null }); setOpenDropdown(null); }}>
                    Unassigned
                  </DropdownMenuItem>
                )}
                {members?.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => { updateTask.mutate({ id: task.id, assignee: m.id }); setOpenDropdown(null); }}
                    className={cn("flex items-center gap-2", task.assignee === m.id && "font-medium")}
                  >
                    <MemberAvatar name={m.name} image={m.image} size="sm" />
                    {m.name ?? m.email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {contactMeta && (
            <a
              href={contactMeta.href}
              aria-label={contactMeta.type === "email" ? `Email ${task.contact}` : `Call ${task.contact}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary max-w-[160px]"
            >
              {contactMeta.type === "email"
                ? <Mail className="h-3 w-3 shrink-0" />
                : <Phone className="h-3 w-3 shrink-0" />}
              <span className="truncate">{task.contact}</span>
            </a>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggleComplete(task.id, !task.completed)}
        className={cn(
          "shrink-0 self-center transition-colors",
          // Mobile: circle button
          "flex items-center justify-center rounded-full border-[1.5px] bg-white",
          "h-9 w-9",
          // Desktop: revert to pill
          "md:flex-none md:h-auto md:w-auto md:rounded-md md:border md:bg-transparent md:px-2.5 md:py-1 md:text-xs md:font-medium",
          task.completed
            ? "border-border text-muted-foreground hover:border-border hover:text-foreground"
            : "border-[#D4A898] md:border-border md:text-muted-foreground md:hover:border-green-500 md:hover:text-green-600 md:hover:bg-green-50 dark:md:hover:bg-green-950/30",
        )}
      >
        {task.completed ? "Undo" : (
          <>
            <Check
              className="h-3.5 w-3.5 md:hidden"
              style={{ color: "#D4A898", strokeWidth: 1.8 }}
            />
            <span className="hidden md:inline">Complete ✓</span>
          </>
        )}
      </button>
    </div>
  );
}
