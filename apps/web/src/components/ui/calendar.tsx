"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import type { CSSProperties } from "react";

type CalendarProps = {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
};

const calendarStyles: CSSProperties = {
  "--rdp-accent-color": "#a0704a",
  "--rdp-accent-background-color": "#f5f0eb",
  "--rdp-day-height": "2rem",
  "--rdp-day-width": "2rem",
} as CSSProperties;

export function Calendar({ selected, onSelect }: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      style={calendarStyles}
    />
  );
}
