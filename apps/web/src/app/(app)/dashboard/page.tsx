export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="heading-md text-foreground">Here&apos;s the Rundown</h2>
        <p className="body text-muted-foreground">
          Your daily overview at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-lg border border-border p-5">
          <p className="label text-muted-foreground">Overdue</p>
          <p className="stat text-foreground">0</p>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border p-5">
          <p className="label text-muted-foreground">Due Today</p>
          <p className="stat text-foreground">0</p>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border p-5">
          <p className="label text-muted-foreground">Completed</p>
          <p className="stat text-foreground">0</p>
        </div>
      </div>
    </div>
  );
}
