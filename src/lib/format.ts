/** Shared date/time formatting for admin & ops UI (readable, consistent). */
export function formatDateTime(value: Date): string {
  return value.toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Calendar date without time (e.g. preferred visit date). */
export function formatDateOnly(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    dateStyle: "medium",
  });
}
