"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { ArrowUpDown, Check, ChevronDown, X } from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { cn } from "@/utils/cn";
import type { TaskView, TaskSort } from "../hooks/use-task-filters";
import type { HouseholdMember } from "@/features/household/api/get-members";

type TaskFiltersProps = {
  view: TaskView;
  category: string;
  priority: string;
  tag: string;
  sort: TaskSort;
  onFilterChange: (key: string, value: string) => void;
  onSortChange: (value: TaskSort) => void;
  members?: HouseholdMember[];
  currentUserId?: string;
  assigneeFilter?: string;
  onAssigneeFilterChange?: (value: string) => void;
};

type FilterId = "members" | "category" | "priority" | "sort";

const VIEWS: { value: TaskView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "starred", label: "Starred" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "Week" },
  { value: "overdue", label: "Late" },
  { value: "completed", label: "Done" },
];

const SORT_LABELS: Record<TaskSort, string> = {
  "due-date": "Due date",
  priority: "Priority",
  assignee: "Assignee",
  created: "Date created",
};

export function TaskFilters({
  view,
  category,
  priority,
  tag,
  sort,
  onFilterChange,
  onSortChange,
  members,
  currentUserId,
  assigneeFilter,
  onAssigneeFilterChange,
}: TaskFiltersProps) {
  const [openFilter, setOpenFilter] = useState<FilterId | null>(null);
  const showMemberFilter = onAssigneeFilterChange && members && members.length > 1;

  function toggle(id: FilterId) {
    setOpenFilter((prev) => (prev === id ? null : id));
  }
  function close() { setOpenFilter(null); }

  const memberLabel = !assigneeFilter
    ? "All members"
    : assigneeFilter === "mine"
      ? "Mine"
      : (members?.find((m) => m.id === assigneeFilter)?.name ?? "Member");

  const categoryLabel = !category
    ? "Category"
    : (DEFAULT_CATEGORIES.find((c) => c.id === category)?.name ?? category);

  const priorityLabel = !priority
    ? "Priority"
    : priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <div className="flex flex-col gap-2">
      {/* View tabs */}
      <div className="flex justify-between">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => onFilterChange("view", v.value === "all" ? "" : v.value)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
              view === v.value
                ? "bg-foreground text-background pointer-events-none"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filter + sort row */}
      <div className="flex flex-nowrap items-center gap-1">
        {showMemberFilter && (
          <Popover open={openFilter === "members"} onOpenChange={(open) => { if (!open) close(); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => toggle("members")}
                className="flex h-7 w-[6.5rem] shrink-0 items-center justify-between gap-1 rounded-md border border-border bg-background px-2 text-xs"
              >
                <span className={cn("truncate", assigneeFilter ? "text-foreground" : "text-muted-foreground")}>
                  {memberLabel}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-40 p-1"
              onInteractOutside={() => close()}
            >
              {[
                { value: "", label: "All members" },
                { value: "mine", label: "Mine" },
                ...members.filter((m) => m.id !== currentUserId).map((m) => ({
                  value: m.id,
                  label: m.name ?? m.email,
                })),
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onAssigneeFilterChange(opt.value); close(); }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                    (assigneeFilter ?? "") === opt.value && "font-medium",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        <Popover open={openFilter === "category"} onOpenChange={(open) => { if (!open) close(); }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={() => toggle("category")}
              className="flex h-7 w-[5.5rem] shrink-0 items-center justify-between gap-1 rounded-md border border-border bg-background px-2 text-xs"
            >
              <span className={cn("truncate", category ? "text-foreground" : "text-muted-foreground")}>
                {categoryLabel}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-40 p-1"
            onInteractOutside={() => close()}
          >
            {[{ id: "", name: "All categories" }, ...DEFAULT_CATEGORIES].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { onFilterChange("category", cat.id); close(); }}
                className={cn(
                  "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                  category === cat.id && "font-medium",
                )}
              >
                {cat.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover open={openFilter === "priority"} onOpenChange={(open) => { if (!open) close(); }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={() => toggle("priority")}
              className="flex h-7 w-[5.5rem] shrink-0 items-center justify-between gap-1 rounded-md border border-border bg-background px-2 text-xs"
            >
              <span className={cn("truncate", priority ? "text-foreground" : "text-muted-foreground")}>
                {priorityLabel}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-32 p-1"
            onInteractOutside={() => close()}
          >
            {[
              { value: "", label: "All priorities" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onFilterChange("priority", opt.value); close(); }}
                className={cn(
                  "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                  priority === opt.value && "font-medium",
                )}
              >
                {opt.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <DropdownMenu
          open={openFilter === "sort"}
          onOpenChange={(isOpen) => { if (!isOpen) close(); }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={() => toggle("sort")}
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Sort tasks"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span className="hidden md:inline">{SORT_LABELS[sort] ?? "Sort"}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="z-50"
            onInteractOutside={() => close()}
          >
            {(["due-date", "priority", "assignee", "created"] as const).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => { onSortChange(s); close(); }}
                className="flex items-center justify-between gap-4"
              >
                {SORT_LABELS[s]}
                {sort === s && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {tag && (
          <button
            type="button"
            onClick={() => onFilterChange("tag", "")}
            className="flex shrink-0 items-center gap-1 h-7 px-2 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            #{tag}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
