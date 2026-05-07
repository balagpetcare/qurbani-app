const TITLE_MAX = 200;
const SUMMARY_MAX = 2000;
const BODY_MAX = 50_000;
const REJECTION_REASON_MAX = 2000;
const REPORT_DETAILS_MAX = 4000;
const MIME_MAX = 128;

export type TutorialFieldsInput = {
  titleBn: string;
  summaryBn: string | null;
  bodyBn: string | null;
  videoUrl: string;
  posterImageUrl: string | null;
  durationSec: number | null;
  mimeType: string | null;
  byteSize: number | null;
};

export type TutorialValidationError = { field: string; message: string };

export function isValidHttpsUrl(raw: string | null | undefined): boolean {
  if (typeof raw !== "string") return false;
  const s = raw.trim();
  if (!s.startsWith("https://")) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && Boolean(u.hostname);
  } catch {
    return false;
  }
}

function trimLen(s: string | null | undefined, max: number): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * @param opts.requireTitleVideo — create + submit checks need both; draft PATCH can omit keys to preserve.
 */
export function validateTutorialContent(
  input: Partial<Record<keyof TutorialFieldsInput, unknown>>,
  opts: { requireTitleVideo: boolean },
):
  | { ok: true; value: TutorialFieldsInput }
  | { ok: false; errors: TutorialValidationError[] } {
  const errors: TutorialValidationError[] = [];

  let titleBn: string | undefined;
  if (input.titleBn !== undefined) {
    if (typeof input.titleBn !== "string") {
      errors.push({ field: "titleBn", message: "শিরোনাম অবৈধ।" });
    } else {
      const t = input.titleBn.trim();
      if (!t) errors.push({ field: "titleBn", message: "শিরোনাম প্রয়োজন।" });
      else if (t.length > TITLE_MAX) {
        errors.push({ field: "titleBn", message: "শিরোনাম খুব দীর্ঘ।" });
      } else titleBn = t;
    }
  } else if (opts.requireTitleVideo) {
    errors.push({ field: "titleBn", message: "শিরোনাম প্রয়োজন।" });
  }

  let videoUrl: string | undefined;
  if (input.videoUrl !== undefined) {
    if (typeof input.videoUrl !== "string") {
      errors.push({ field: "videoUrl", message: "ভিডিও লিংক অবৈধ।" });
    } else {
      const v = input.videoUrl.trim();
      if (!v || !isValidHttpsUrl(v)) {
        errors.push({
          field: "videoUrl",
          message: "শুধুমাত্র https ভিডিও লিংক গ্রহণযোগ্য।",
        });
      } else videoUrl = v;
    }
  } else if (opts.requireTitleVideo) {
    errors.push({
      field: "videoUrl",
      message: "শুধুমাত্র https ভিডিও লিংক গ্রহণযোগ্য।",
    });
  }

  let summaryBn: string | null = null;
  if (input.summaryBn !== undefined) {
    summaryBn = trimLen(input.summaryBn as string | null, SUMMARY_MAX);
  }

  let bodyBn: string | null = null;
  if (input.bodyBn !== undefined) {
    bodyBn = trimLen(input.bodyBn as string | null, BODY_MAX);
  }

  let posterImageUrl: string | null = null;
  if (input.posterImageUrl !== undefined) {
    if (input.posterImageUrl === null || input.posterImageUrl === "") {
      posterImageUrl = null;
    } else {
      const p = String(input.posterImageUrl).trim();
      if (p && !isValidHttpsUrl(p)) {
        errors.push({
          field: "posterImageUrl",
          message: "পোস্টারের জন্য শুধু https লিংক।",
        });
      } else {
        posterImageUrl = p ? p : null;
      }
    }
  }

  let durationSec: number | null = null;
  if (input.durationSec !== undefined && input.durationSec !== null) {
    const n = Number(input.durationSec);
    if (!Number.isFinite(n) || n < 0 || n > 86400) {
      errors.push({ field: "durationSec", message: "সময়কাল অবৈধ।" });
    } else {
      durationSec = Math.floor(n);
    }
  }

  let mimeType: string | null = null;
  if (input.mimeType !== undefined && input.mimeType !== null) {
    const m = String(input.mimeType).trim();
    if (m.length > MIME_MAX) {
      errors.push({ field: "mimeType", message: "MIME খুব দীর্ঘ।" });
    } else {
      mimeType = m || null;
    }
  }

  let byteSize: number | null = null;
  if (input.byteSize !== undefined && input.byteSize !== null) {
    const b = Number(input.byteSize);
    if (!Number.isFinite(b) || b < 0 || b > 5_000_000_000) {
      errors.push({ field: "byteSize", message: "ফাইল সাইজ অবৈধ।" });
    } else {
      byteSize = Math.floor(b);
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      titleBn: titleBn ?? "",
      summaryBn,
      bodyBn,
      videoUrl: videoUrl ?? "",
      posterImageUrl,
      durationSec,
      mimeType,
      byteSize,
    },
  };
}

export function validateRejectionReason(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== "string") {
    return { ok: false, message: "কারণ লিখুন।" };
  }
  const t = raw.trim();
  if (t.length < 3) return { ok: false, message: "কারণ খুব ছোট।" };
  if (t.length > REJECTION_REASON_MAX) {
    return { ok: false, message: "কারণ খুব দীর্ঘ।" };
  }
  return { ok: true, value: t };
}

export function validateReportDetails(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string") {
    return { ok: false, message: "বিবরণ অবৈধ।" };
  }
  const t = raw.trim();
  if (t.length > REPORT_DETAILS_MAX) {
    return { ok: false, message: "বিবরণ খুব দীর্ঘ।" };
  }
  return { ok: true, value: t.length ? t : null };
}
