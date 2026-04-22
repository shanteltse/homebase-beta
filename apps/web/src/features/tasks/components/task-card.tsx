"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, Check, Mail, Phone, Repeat, Star, UserRound } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  compact?: boolean;
  grouped?: boolean;
};

function formatCompactDate(dueDate: string): string {
  const parts = dueDate.split("T")[0]!.split("-").map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type OpenDropdown = "category" | "priority" | "assignee" | "date" | null;

function parseTaskDate(dueDate: string): Date {
  const parts = dueDate.split("T")[0]!.split("-").map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

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
  const dueDateStr = dueDate.split("T")[0]!;
  const todayStr = new Date().toLocaleDateString("en-CA");
  return dueDateStr < todayStr;
}

function getContactMeta(contact: string | null | undefined): { type: "email" | "phone"; href: string } | null {
  if (!contact) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))
    return { type: "email", href: `mailto:${contact}` };
  if (/^[+\d][\d\s\-().]{6,}$/.test(contact))
    return { type: "phone", href: `tel:${contact.replace(/\s/g, "")}` };
  return null;
}

export function TaskCard({ task, onToggleComplete, onToggleStar, onTagClick, compact = false, grouped = false }: TaskCardProps) {
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
        "flex items-start gap-3 p-4 transition-colors hover:bg-muted/50",
        !grouped && "rounded-lg border border-border",
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
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/tasks/${task.id}`}
            className={cn(
              "body font-medium text-foreground hover:text-primary min-w-0",
              compact ? "shrink truncate" : "break-words flex-1",
              task.completed && "line-through",
              task.starred && "font-bold",
            )}
          >
            {task.title}
          </Link>
          {contactMeta && (
            <a
              href={contactMeta.href}
              aria-label={contactMeta.type === "email" ? `Email ${task.contact}` : `Call ${task.contact}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary max-w-[160px]"
            >
              {contactMeta.type === "email"
                ? <Mail className="h-3 w-3 shrink-0" />
                : <Phone className="h-3 w-3 shrink-0" />}
              <span className="truncate">{task.contact}</span>
            </a>
          )}
          {compact && (
            <>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => onToggleComplete(task.id, !task.completed)}
                className={cn(
                  "shrink-0 flex items-center justify-center rounded-full border-[1.5px] bg-white h-7 w-7 transition-colors",
                  task.completed ? "border-border" : "border-[#D4A898]",
                )}
                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
              >
                <Check
                  className="h-3.5 w-3.5"
                  style={task.completed
                    ? { color: "var(--muted-foreground)", strokeWidth: 1.8 }
                    : { color: "#D4A898", strokeWidth: 1.8 }}
                />
              </button>
            </>
          )}
        </div>

        {/* Row 2: category · priority · date · assignee */}
        <div className={cn("flex items-center", compact ? "gap-1.5 min-w-0 overflow-hidden flex-nowrap" : "gap-2")}>
          <Popover open={openDropdown === "category"} onOpenChange={(open) => { if (!open) setOpenDropdown(null); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("category"); }}
              >
                <Badge variant={CATEGORY_VARIANTS[task.category] ?? "default"} className={compact ? "px-1.5 py-0.5 text-xs" : undefined}>
                  {categoryName}
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-40 p-1">
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { updateTask.mutate({ id: task.id, category: cat.id }); setOpenDropdown(null); }}
                  className={cn("flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted", task.category === cat.id && "font-medium")}
                >
                  {cat.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={openDropdown === "priority"} onOpenChange={(open) => { if (!open) setOpenDropdown(null); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("priority"); }}
              >
                <Badge variant={PRIORITY_VARIANTS[task.priority]} className={compact ? "px-1.5 py-0.5 text-xs" : undefined}>
                  {task.priority}
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-32 p-1">
              {(["high", "medium", "low"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { updateTask.mutate({ id: task.id, priority: p }); setOpenDropdown(null); }}
                  className={cn("flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted", task.priority === p && "font-medium")}
                >
                  {p}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Due date — inline editable Popover */}
          {task.dueDate && task.dueDate !== "" ? (
            <span className="caption flex items-center gap-1">
              <Popover open={openDropdown === "date"} onOpenChange={(open) => { if (!open) setOpenDropdown(null); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("date"); }}
                    className={cn(
                      "caption inline-flex items-center rounded-full px-2 py-0.5 transition-opacity hover:opacity-80",
                      overdue ? "bg-red-100 text-destructive" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {formatCompactDate(task.dueDate)}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <Calendar
                    selected={parseTaskDate(task.dueDate)}
                    onSelect={(date) => {
                      if (date) updateTask.mutate({ id: task.id, dueDate: format(date, "yyyy-MM-dd") });
                      setOpenDropdown(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { updateTask.mutate({ id: task.id, dueDate: null }); setOpenDropdown(null); }}
                    className="mt-1 w-full rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Clear date
                  </button>
                </PopoverContent>
              </Popover>
              {task.recurring && (
                <span title={`Repeats ${(task.recurring as { frequency: string }).frequency}`}>
                  <Repeat className="h-3 w-3 text-muted-foreground" />
                </span>
              )}
            </span>
          ) : (
            <>
              {task.recurring && (
                <span
                  className="caption flex items-center gap-1 text-muted-foreground"
                  title={`Repeats ${(task.recurring as { frequency: string }).frequency}`}
                >
                  <Repeat className="h-3 w-3" />
                  {!compact && (task.recurring as { frequency: string }).frequency}
                </span>
              )}
              <Popover open={openDropdown === "date"} onOpenChange={(open) => { if (!open) setOpenDropdown(null); }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Set due date"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleDropdown("date"); }}
                    className="text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-2">
                  <Calendar
                    selected={undefined}
                    onSelect={(date) => {
                      if (date) updateTask.mutate({ id: task.id, dueDate: format(date, "yyyy-MM-dd") });
                      setOpenDropdown(null);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

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
                    className={cn("flex items-center gap-1.5 hover:opacity-70 transition-opacity", compact && "shrink-0")}
                  >
                    <MemberAvatar name={assignedMember.name} image={assignedMember.image} size="sm" avatarColor={assignedMember.avatarColor} useGooglePhoto={assignedMember.useGooglePhoto} />
                    {!compact && (
                      <span className="caption text-muted-foreground">
                        {assignedMember.name ?? assignedMember.email}
                      </span>
                    )}
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
                    <MemberAvatar name={m.name} image={m.image} size="sm" avatarColor={m.avatarColor} useGooglePhoto={m.useGooglePhoto} />
                    {m.name ?? m.email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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

        </div>
      </div>

      {!compact && (
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
      )}
    </div>
  );
}
