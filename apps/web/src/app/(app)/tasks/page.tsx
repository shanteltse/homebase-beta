export default function TasksPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="heading-md text-foreground">Tasks</h2>
        </div>
        <p className="body text-muted-foreground">
          Manage your tasks and stay on top of things.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-12 text-center body text-muted-foreground">
        Task list will be implemented in Phase 1
      </div>
    </div>
  );
}
