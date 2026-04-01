"use client";

import { Button } from "@repo/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { DEFAULT_CATEGORIES } from "@/types/category";
import { cn } from "@/utils/cn";
import type { TaskView, TaskSort } from "../hooks/use-task-filters";
import type { HouseholdMember } from "@/features/household/api/get-members";

type TaskFiltersProps = {
  view: TaskView;
  category: string;
  priority: string;
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
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

export function TaskFilters({
  view,
  category,
  priority,
  sort,
  onFilterChange,
  onSortChange,
  members,
  currentUserId,
  assigneeFilter,
  onAssigneeFilterChange,
}: TaskFiltersProps) {
  const showMemberFilter =
    onAssigneeFilterChange && members && members.length > 1;

  return (
    <div className="flex flex-col gap-3">
      {/* View tabs — scrolls horizontally on narrow screens rather than overflowing */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {VIEWS.map((v) => (
          <Button
            key={v.value}
            variant={view === v.value ? "primary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("view", v.value === "all" ? "" : v.value)}
            className={cn("shrink-0", view === v.value && "pointer-events-none")}
          >
            {v.label}
          </Button>
        ))}
      </div>

      {/* Member filter — only shown when household has >1 member */}
      {showMemberFilter && (
        <Select
          value={assigneeFilter ?? ""}
          onValueChange={(val) => onAssigneeFilterChange(val === "all" ? "" : val)}
        >
          <SelectTrigger className="flex-1 min-w-[8rem] max-w-[12rem]">
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

      {/* Filter selects — wrap onto a second line on narrow screens */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={category}
          onValueChange={(val) => onFilterChange("category", val === "all" ? "" : val)}
        >
          <SelectTrigger className="flex-1 min-w-[9rem] max-w-[12rem]">
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
          onValueChange={(val) =>
            onFilterChange("priority", val === "all" ? "" : val)
          }
        >
          <SelectTrigger className="flex-1 min-w-[8rem] max-w-[10rem]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(val) => onSortChange(val as TaskSort)}
        >
          <SelectTrigger className="flex-1 min-w-[9rem] max-w-[11rem]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due-date">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="assignee">Assignee</SelectItem>
            <SelectItem value="created">Date Created</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
