/**
 * Converts a Date or ISO string to a YYYY-MM-DD string in LOCAL time.
 * Uses "en-CA" locale which formats as YYYY-MM-DD — never toISOString() which is UTC.
 */
export function toLocalDateStr(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-CA");
}

/**
 * Formats a completedAt timestamp for display in local time.
 */
export function formatCompletedAt(date: Date | string): string {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
