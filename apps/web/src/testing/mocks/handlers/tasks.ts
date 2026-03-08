import { http, HttpResponse } from "msw";

let nextId = 1;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tasks: Record<string, any>[] = [
  {
    id: "task-1",
    userId: "test-user-id",
    title: "Buy groceries",
    category: "family-home",
    subcategory: "meal-planning",
    priority: "high" as const,
    status: "active" as const,
    dueDate: new Date().toISOString(),
    completed: false,
    completedAt: null,
    subtasks: [],
    tags: [],
    assignee: null,
    recurring: null,
    notes: "Milk, eggs, bread",
    links: [],
    starred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    userId: "test-user-id",
    title: "Schedule dentist",
    category: "personal",
    subcategory: null,
    priority: "medium" as const,
    status: "active" as const,
    dueDate: null,
    completed: false,
    completedAt: null,
    subtasks: [],
    tags: [],
    assignee: null,
    recurring: null,
    notes: null,
    links: [],
    starred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    userId: "test-user-id",
    title: "Completed task",
    category: "work-career",
    subcategory: null,
    priority: "low" as const,
    status: "completed" as const,
    dueDate: null,
    completed: true,
    completedAt: new Date().toISOString(),
    subtasks: [],
    tags: [],
    assignee: null,
    recurring: null,
    notes: null,
    links: [],
    starred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const taskHandlers = [
  http.get("/api/tasks", () => {
    return HttpResponse.json(tasks);
  }),

  http.get("/api/tasks/:taskId", ({ params }) => {
    const task = tasks.find((t) => t.id === params.taskId);
    if (!task) return HttpResponse.json({ error: "Not found" }, { status: 404 });
    return HttpResponse.json(task);
  }),

  http.post("/api/tasks", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newTask = {
      id: `task-new-${nextId++}`,
      userId: "test-user-id",
      title: body.title as string,
      category: body.category as string,
      subcategory: (body.subcategory as string) ?? null,
      priority: (body.priority as string) ?? "medium",
      status: "active" as const,
      dueDate: body.dueDate ? new Date(body.dueDate as string).toISOString() : null,
      completed: false,
      completedAt: null,
      subtasks: [],
      tags: [],
      assignee: null,
      recurring: null,
      notes: (body.notes as string) ?? null,
      links: [],
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.patch("/api/tasks/:taskId", async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.taskId);
    if (!task) return HttpResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json() as Record<string, unknown>;
    Object.assign(task, body, { updatedAt: new Date().toISOString() });

    if (body.completed === true) {
      task.completedAt = new Date().toISOString();
      task.status = "completed";
    } else if (body.completed === false) {
      task.completedAt = null;
      task.status = "active";
    }

    return HttpResponse.json(task);
  }),

  http.delete("/api/tasks/:taskId", ({ params }) => {
    const idx = tasks.findIndex((t) => t.id === params.taskId);
    if (idx === -1) return HttpResponse.json({ error: "Not found" }, { status: 404 });
    tasks.splice(idx, 1);
    return HttpResponse.json({ success: true });
  }),
];
