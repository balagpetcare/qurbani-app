export function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length ? t : undefined;
}

/** Positive integers from array (area IDs, etc.). */
export function parsePositiveIntIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const ids: number[] = [];
  for (const x of raw) {
    if (typeof x === "number" && Number.isInteger(x) && x > 0) {
      ids.push(x);
    } else if (typeof x === "string") {
      const n = parseInt(x.trim(), 10);
      if (!Number.isNaN(n) && n > 0) ids.push(n);
    }
  }
  return ids;
}
