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

type TaskFiltersProps = {
  view: TaskView;
  category: string;
  priority: string;
  sort: TaskSort;
  onFilterChange: (key: string, value: string) => void;
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
}: TaskFiltersProps) {
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
          onValueChange={(val) => onFilterChange("sort", val === "due-date" ? "" : val)}
        >
          <SelectTrigger className="flex-1 min-w-[9rem] max-w-[11rem]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due-date">Due date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="created">Newest first</SelectItem>
            <SelectItem value="alphabetical">A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
