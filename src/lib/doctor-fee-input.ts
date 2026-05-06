/**
 * Parse admin/API payloads for `homeVisitFeeMin` / `homeVisitFeeMax` / `feeNote`.
 * - Omitted field → undefined (do not update on PATCH).
 * - `null` → clear to null.
 * - Positive integers only when non-null.
 * Use {@link assertHomeVisitFeesConsistent} on the effective min/max after merge with existing row.
 */

export type ParsedDoctorFeesPartial =
  | {
      ok: true;
      homeVisitFeeMin?: number | null;
      homeVisitFeeMax?: number | null;
      feeNote?: string | null;
    }
  | { ok: false; error: string };

function readOptionalPositiveInt(
  body: Record<string, unknown>,
  key: string,
): number | null | undefined {
  if (!(key in body)) return undefined;
  const v = body[key];
  if (v === null) return null;
  if (typeof v === "number" && Number.isInteger(v) && v > 0) return v;
  if (typeof v === "string" && v.trim() === "") return null;
  if (typeof v === "string") {
    const n = parseInt(v.trim(), 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  throw new Error(`INVALID:${key}`);
}

function readOptionalFeeNote(
  body: Record<string, unknown>,
): string | null | undefined {
  if (!("feeNote" in body)) return undefined;
  const v = body.feeNote;
  if (v === null) return null;
  if (typeof v !== "string") throw new Error("INVALID:feeNote");
  const t = v.trim();
  return t.length ? t.slice(0, 500) : null;
}

export function parseDoctorHomeVisitFeesFromBody(
  body: Record<string, unknown>,
): ParsedDoctorFeesPartial {
  try {
    const homeVisitFeeMin = readOptionalPositiveInt(body, "homeVisitFeeMin");
    const homeVisitFeeMax = readOptionalPositiveInt(body, "homeVisitFeeMax");
    const feeNote = readOptionalFeeNote(body);

    return {
      ok: true,
      ...(homeVisitFeeMin !== undefined ? { homeVisitFeeMin } : {}),
      ...(homeVisitFeeMax !== undefined ? { homeVisitFeeMax } : {}),
      ...(feeNote !== undefined ? { feeNote } : {}),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("INVALID:")) {
      const field = msg.slice("INVALID:".length);
      return {
        ok: false,
        error: `${field} must be a positive whole number or null`,
      };
    }
    return { ok: false, error: "Invalid fee fields" };
  }
}

/** Returns an English error message, or null if OK. */
export function assertHomeVisitFeesConsistent(
  min: number | null,
  max: number | null,
): string | null {
  const hasMin = min != null && min > 0;
  const hasMax = max != null && max > 0;
  if (hasMax && !hasMin) {
    return "homeVisitFeeMin is required when homeVisitFeeMax is set";
  }
  if (hasMin && hasMax && max! < min!) {
    return "homeVisitFeeMax must be greater than or equal to homeVisitFeeMin";
  }
  return null;
}
