"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { ArrowUpDown, Check, X } from "lucide-react";
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

const VIEWS: { value: TaskView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "starred", label: "⭐ Starred" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

export function TaskFilters({
  view,
  category,
  priority,
  tag,
  sort,
  onFilterChange,
  onSortChange,
  members,
  assigneeFilter,
  onAssigneeFilterChange,
}: TaskFiltersProps) {
  const showMemberFilter =
    onAssigneeFilterChange && members && members.length > 1;

  return (
    <div className="flex flex-col gap-2">
      {/* View tabs — compact, scrolls horizontally on narrow screens */}
      <div className="flex gap-0.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => onFilterChange("view", v.value === "all" ? "" : v.value)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              view === v.value
                ? "bg-foreground text-background pointer-events-none"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filter selects row — compact height */}
      <div className="flex flex-wrap gap-1.5">
        {showMemberFilter && (
          <Select
            value={assigneeFilter ?? ""}
            onValueChange={(val) => onAssigneeFilterChange(val === "all" ? "" : val)}
          >
            <SelectTrigger className="h-7 text-xs flex-1 min-w-[7rem] max-w-[10rem]">
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              <SelectItem value="mine">Mine</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name ?? m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={category}
          onValueChange={(val) => onFilterChange("category", val === "all" ? "" : val)}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-[7rem] max-w-[10rem]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {DEFAULT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priority}
          onValueChange={(val) => onFilterChange("priority", val === "all" ? "" : val)}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-[6rem] max-w-[9rem]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Sort tasks"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span className="hidden sm:inline">
                {sort === "due-date" ? "Due Date" : sort === "priority" ? "Priority" : sort === "assignee" ? "Assignee" : "Date Created"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(["due-date", "priority", "assignee", "created"] as const).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onSortChange(s)} className="flex items-center justify-between gap-4">
                {s === "due-date" ? "Due Date" : s === "priority" ? "Priority" : s === "assignee" ? "Assignee" : "Date Created"}
                {sort === s && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {tag && (
          <button
            type="button"
            onClick={() => onFilterChange("tag", "")}
            className="flex items-center gap-1 h-7 px-2 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            #{tag}
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
