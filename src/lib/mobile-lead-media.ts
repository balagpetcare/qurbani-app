/**
 * Public mobile lead media — must stay in sync with Flutter
 * `mobile_flutter/lib/core/media/lead_media_limits.dart`.
 *
 * Storage path prefix (Vercel Blob pathname): `mobile/leads/{yyyy}/{mm}/…`
 */

export const MOBILE_LEAD_MEDIA_MAX_ITEMS = 5;

/** Per-file caps (bytes). */
export const MOBILE_LEAD_MEDIA_MAX_BYTES_IMAGE = 8 * 1024 * 1024;
export const MOBILE_LEAD_MEDIA_MAX_BYTES_VIDEO = 20 * 1024 * 1024;

export const MOBILE_LEAD_MEDIA_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "video/mp4",
] as const;

export type MobileLeadMediaMime = (typeof MOBILE_LEAD_MEDIA_ALLOWED_MIME_TYPES)[number];

export function maxBytesForMobileLeadMime(contentType: string): number {
  const ct = contentType.trim().toLowerCase();
  if (ct.startsWith("video/")) return MOBILE_LEAD_MEDIA_MAX_BYTES_VIDEO;
  return MOBILE_LEAD_MEDIA_MAX_BYTES_IMAGE;
}

export function isAllowedMobileLeadMime(contentType: string): contentType is MobileLeadMediaMime {
  const ct = contentType.trim().toLowerCase();
  return (MOBILE_LEAD_MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(ct);
}

import { randomUUID } from "node:crypto";

export function blobPathnameForMobileLeadUpload(originalName: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safe = originalName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const id = randomUUID();
  return `mobile/leads/${y}/${m}/${id}-${safe || "file"}`;
}
