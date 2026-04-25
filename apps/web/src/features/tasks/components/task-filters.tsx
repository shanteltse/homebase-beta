"use client";

import { useState, useEffect } from "react";
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

type FilterId = "members" | "category" | "priority" | "sort";

const VIEWS: { value: TaskView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "starred", label: "Starred" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "Week" },
  { value: "overdue", label: "Late" },
  { value: "completed", label: "Done" },
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
  currentUserId,
  assigneeFilter,
  onAssigneeFilterChange,
}: TaskFiltersProps) {
  const [openFilter, setOpenFilter] = useState<FilterId | null>(null);
  const [overlayReady, setOverlayReady] = useState(false);
  const showMemberFilter =
    onAssigneeFilterChange && members && members.length > 1;

  useEffect(() => {
    if (openFilter !== null) {
      const t = setTimeout(() => setOverlayReady(true), 50);
      return () => clearTimeout(t);
    } else {
      setOverlayReady(false);
    }
  }, [openFilter]);

  function open(id: FilterId) { setOpenFilter(id); }
  function close() { setOpenFilter(null); }

  return (
    <div className="flex flex-col gap-2">
      {/* Full-screen overlay — use onPointerDown (= touchstart) so React
          re-renders and removes the overlay before touchend fires; touchend
          then lands on the element underneath, giving one-tap dismiss+act */}
      {openFilter !== null && overlayReady && (
        <div className="fixed inset-0 z-[45]" onPointerDown={close} />
      )}

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
      <div className="flex w-full flex-nowrap items-center justify-between gap-1">
        {showMemberFilter && (
          <Select
            open={openFilter === "members"}
            onOpenChange={(isOpen) => isOpen ? open("members") : close()}
            value={assigneeFilter ?? ""}
            onValueChange={(val) => {
              onAssigneeFilterChange(val === "all" ? "" : val);
              close();
            }}
          >
            <SelectTrigger className="h-7 w-[6.5rem] shrink-0 text-xs px-2">
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="all">All members</SelectItem>
              <SelectItem value="mine">Mine</SelectItem>
              {members.filter((m) => m.id !== currentUserId).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name ?? m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          open={openFilter === "category"}
          onOpenChange={(isOpen) => isOpen ? open("category") : close()}
          value={category}
          onValueChange={(val) => {
            onFilterChange("category", val === "all" ? "" : val);
            close();
          }}
        >
          <SelectTrigger className="h-7 w-[5.5rem] shrink-0 text-xs px-2">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="all">All categories</SelectItem>
            {DEFAULT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          open={openFilter === "priority"}
          onOpenChange={(isOpen) => isOpen ? open("priority") : close()}
          value={priority}
          onValueChange={(val) => {
            onFilterChange("priority", val === "all" ? "" : val);
            close();
          }}
        >
          <SelectTrigger className="h-7 w-[5.5rem] shrink-0 text-xs px-2">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu
          open={openFilter === "sort"}
          onOpenChange={(isOpen) => isOpen ? open("sort") : close()}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Sort tasks"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span className="hidden md:inline">
                {sort === "due-date" ? "Due date" : sort === "priority" ? "Priority" : sort === "assignee" ? "Assignee" : sort === "created" ? "Date created" : "Sort"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50">
            {(["due-date", "priority", "assignee", "created"] as const).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => { onSortChange(s); close(); }}
                className="flex items-center justify-between gap-4"
              >
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
