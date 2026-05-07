import { NextResponse } from "next/server";

import {
  isAllowedMobileLeadMime,
  maxBytesForMobileLeadMime,
  MOBILE_LEAD_MEDIA_ALLOWED_MIME_TYPES,
  MOBILE_LEAD_MEDIA_MAX_BYTES_IMAGE,
  MOBILE_LEAD_MEDIA_MAX_BYTES_VIDEO,
} from "@/lib/mobile-lead-media";
import { signMobileUploadIntent } from "@/lib/mobile-upload-intent";
import { assertMobileMediaUploadAllowed } from "@/lib/public-rate-limit";

type Body = {
  contentType?: unknown;
  byteSize?: unknown;
  kind?: unknown;
};

const NOT_CONFIGURED_BN =
  "মিডিয়া আপলোড এই সার্ভারে এখনো চালু করা হয়নি। অ্যাডমিন BLOB_READ_WRITE_TOKEN সেট করলে চালু হবে।";

export async function POST(request: Request) {
  const rl = assertMobileMediaUploadAllowed(request);
  if (rl) return rl;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", messageBn: "তথ্য সঠিক ফরম্যাটে নেই।" },
      { status: 400 },
    );
  }

  const contentType =
    typeof body.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
  if (!contentType || !isAllowedMobileLeadMime(contentType)) {
    return NextResponse.json(
      {
        error: "Unsupported content type",
        messageBn:
          "এই ধরনের ফাইল অনুমোদিত নয়। শুধু ছবি (JPEG, PNG, WebP, HEIC) অথবা MP4 ভিডিও।",
        allowedMimeTypes: [...MOBILE_LEAD_MEDIA_ALLOWED_MIME_TYPES],
        maxBytesImage: MOBILE_LEAD_MEDIA_MAX_BYTES_IMAGE,
        maxBytesVideo: MOBILE_LEAD_MEDIA_MAX_BYTES_VIDEO,
      },
      { status: 400 },
    );
  }

  let byteSize: number | undefined;
  if (body.byteSize !== undefined && body.byteSize !== null && body.byteSize !== "") {
    if (typeof body.byteSize === "number" && Number.isFinite(body.byteSize)) {
      byteSize = Math.floor(body.byteSize);
    } else if (typeof body.byteSize === "string" && body.byteSize.trim() !== "") {
      const n = parseInt(body.byteSize.trim(), 10);
      if (!Number.isNaN(n)) byteSize = n;
    }
  }

  const max = maxBytesForMobileLeadMime(contentType);
  if (byteSize !== undefined && (byteSize < 0 || byteSize > max)) {
    return NextResponse.json(
      {
        error: "byteSize out of range",
        messageBn: `ফাইলের আকার সর্বোচ্চ ${Math.floor(max / (1024 * 1024))} MB হতে হবে।`,
        maxBytes: max,
      },
      { status: 400 },
    );
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({
      available: false,
      code: "MEDIA_UPLOAD_NOT_CONFIGURED",
      messageBn: NOT_CONFIGURED_BN,
      allowedMimeTypes: [...MOBILE_LEAD_MEDIA_ALLOWED_MIME_TYPES],
      maxBytesImage: MOBILE_LEAD_MEDIA_MAX_BYTES_IMAGE,
      maxBytesVideo: MOBILE_LEAD_MEDIA_MAX_BYTES_VIDEO,
      storagePathPrefix: "mobile/leads/{year}/{month}/",
      note:
        "Set BLOB_READ_WRITE_TOKEN from a Vercel Blob store; optional PUBLIC_MEDIA_* rate limits in .env.example.",
    });
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 120;
  const nonce = `${now}-${Math.random().toString(16).slice(2)}`;
  const uploadIntent = signMobileUploadIntent({
    exp,
    ct: contentType,
    max,
    nonce,
  });

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const uploadPath = "/api/mobile/media/ingest";

  return NextResponse.json({
    available: true,
    method: "POST",
    uploadUrl: `${origin}${uploadPath}`,
    uploadPath,
    uploadIntent,
    headerName: "X-Qurbani-Upload-Intent",
    maxBytes: max,
    allowedMimeTypes: [...MOBILE_LEAD_MEDIA_ALLOWED_MIME_TYPES],
    contentType,
    expiresAt: new Date(exp * 1000).toISOString(),
  });
}
