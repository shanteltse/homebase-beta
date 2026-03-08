type TaskDetailPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { taskId } = await params;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="heading-md text-foreground">Task Detail</h2>
        <p className="body text-muted-foreground">Viewing task {taskId}</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-12 text-center body text-muted-foreground">
        Task detail view will be implemented in Phase 1
      </div>
    </div>
  );
}
