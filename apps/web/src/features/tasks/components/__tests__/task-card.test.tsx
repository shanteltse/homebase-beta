import { describe, it, expect, vi } from "vitest";
import { renderApp, screen } from "@/testing/test-utils";
import { TaskCard } from "../task-card";
import type { Task } from "@/types/task";

const baseTask: Task = {
  id: "task-1",
  title: "Buy groceries",
  category: "family-home",
  priority: "high",
  status: "active",
  completed: false,
  subtasks: [],
  tags: [],
  links: [],
  starred: false,
  userId: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("TaskCard", () => {
  it("renders the task title", () => {
    renderApp(
      <TaskCard task={baseTask} onToggleComplete={vi.fn()} />,
    );
    expect(screen.getByText("Buy groceries")).toBeInTheDocument();
  });

  it("renders category and priority badges", () => {
    renderApp(
      <TaskCard task={baseTask} onToggleComplete={vi.fn()} />,
    );
    expect(screen.getByText("Family & Home")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("shows overdue indicator for past due dates", () => {
    const overdueTask: Task = {
      ...baseTask,
      dueDate: "2020-01-01T00:00:00.000Z",
    };
    renderApp(
      <TaskCard task={overdueTask} onToggleComplete={vi.fn()} />,
    );
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it("shows line-through when completed", () => {
    const completedTask: Task = { ...baseTask, completed: true };
    renderApp(
      <TaskCard task={completedTask} onToggleComplete={vi.fn()} />,
    );
    const link = screen.getByText("Buy groceries");
    expect(link.className).toContain("line-through");
  });

  it("calls onToggleComplete when checkbox is clicked", async () => {
    const onToggle = vi.fn();
    renderApp(
      <TaskCard task={baseTask} onToggleComplete={onToggle} />,
    );
    const checkbox = screen.getByRole("checkbox");
    checkbox.click();
    expect(onToggle).toHaveBeenCalledWith("task-1", true);
  });

  it("shows subtask count when subtasks exist", () => {
    const taskWithSubtasks: Task = {
      ...baseTask,
      subtasks: [
        { id: "s1", title: "Sub 1", completed: true },
        { id: "s2", title: "Sub 2", completed: false },
      ],
    };
    renderApp(
      <TaskCard task={taskWithSubtasks} onToggleComplete={vi.fn()} />,
    );
    expect(screen.getByText("1/2 subtasks")).toBeInTheDocument();
  });

  it("links to task detail page", () => {
    renderApp(
      <TaskCard task={baseTask} onToggleComplete={vi.fn()} />,
    );
    const link = screen.getByText("Buy groceries");
    expect(link.closest("a")).toHaveAttribute("href", "/tasks/task-1");
  });
});
