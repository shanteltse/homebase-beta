"use client";

import { RefreshCw, Pencil } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@repo/ui/popover";
import { Input } from "@repo/ui/input";
import { cn } from "@/utils/cn";
import type { RecurringPattern } from "@/types/task";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  custom: "Custom",
};

type RecurringPickerProps = {
  value: RecurringPattern | undefined;
  onChange: (value: RecurringPattern | undefined) => void;
};

export function RecurringPicker({ value, onChange }: RecurringPickerProps) {
  const frequency = value?.frequency ?? "none";

  function handleFrequencyChange(freq: string) {
    if (freq === "none") {
      onChange(undefined);
      return;
    }
    const pattern: RecurringPattern = {
      frequency: freq as RecurringPattern["frequency"],
    };
    if (freq === "weekly") pattern.daysOfWeek = value?.daysOfWeek ?? [];
    if (freq === "custom") pattern.interval = value?.interval ?? 1;
    onChange(pattern);
  }

  function handleToggleDay(day: number) {
    if (!value) return;
    const current = value.daysOfWeek ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    onChange({ ...value, daysOfWeek: next });
  }

  function handleIntervalChange(interval: number) {
    if (!value) return;
    onChange({ ...value, interval: Math.max(1, interval) });
  }

  const isSet = frequency !== "none";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Set recurring schedule"
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            isSet
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
              : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <RefreshCw className="h-3 w-3" />
          {isSet ? FREQ_LABELS[frequency] : "No repeat"}
          <Pencil className="h-2.5 w-2.5 opacity-50 sm:opacity-0 sm:group-hover:opacity-60 transition-opacity" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-3">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-foreground">Recurring</p>

          {/* Frequency options */}
          <div className="flex flex-wrap gap-1.5">
            {["none", "daily", "weekly", "biweekly", "monthly", "custom"].map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => handleFrequencyChange(freq)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  frequency === freq
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {freq === "none" ? "None" : FREQ_LABELS[freq]}
              </button>
            ))}
          </div>

          {/* Day picker for weekly */}
          {frequency === "weekly" && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Repeat on</p>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, index) => {
                  const selected = value?.daysOfWeek?.includes(index) ?? false;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleToggleDay(index)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {label.charAt(0)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interval for custom */}
          {frequency === "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Every</span>
              <Input
                id="recurring-interval"
                type="number"
                min={1}
                value={value?.interval ?? 1}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="w-16 h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
