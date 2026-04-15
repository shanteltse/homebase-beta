"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { MemberAvatar } from "./member-avatar";
import type { HouseholdMember } from "../api/get-members";
import type { Task } from "@/types/task";

type HouseholdOverviewProps = {
  members: HouseholdMember[];
  tasks: Task[];
};

export function HouseholdOverview({ members, tasks }: HouseholdOverviewProps) {
  const [open, setOpen] = useState(true);

  if (members.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 group"
        >
          <p className="label text-muted-foreground group-hover:text-foreground transition-colors">
            Household
          </p>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
        </button>
        {open && (
          <Link
            href="/tasks?sort=assignee"
            className="caption text-primary hover:underline"
          >
            View by member →
          </Link>
        )}
      </div>
      {open && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
          {members.map((member) => {
            const memberTasks = tasks.filter((t) => t.assignee === member.id);
            const activeCount = memberTasks.filter((t) => !t.completed).length;
            const total = memberTasks.length;
            const completedCount = total - activeCount;
            const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

            return (
              <div
                key={member.id}
                className="flex min-w-[148px] shrink-0 flex-col gap-2.5 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MemberAvatar name={member.name} image={member.image} size="sm" />
                  <span className="body truncate font-medium text-foreground text-sm">
                    {member.name ?? member.email}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="caption text-muted-foreground">
                    {activeCount}/{total} tasks · {pct}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
