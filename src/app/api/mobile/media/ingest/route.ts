import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import {
  blobPathnameForMobileLeadUpload,
  isAllowedMobileLeadMime,
} from "@/lib/mobile-lead-media";
import { verifyMobileUploadIntent } from "@/lib/mobile-upload-intent";
import { assertMobileMediaUploadAllowed } from "@/lib/public-rate-limit";

export async function POST(request: Request) {
  const rl = assertMobileMediaUploadAllowed(request);
  if (rl) return rl;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error: "MEDIA_UPLOAD_NOT_CONFIGURED",
        messageBn:
          "মিডিয়া আপলোড সার্ভারে চালু নেই। BLOB_READ_WRITE_TOKEN সেট করতে হবে।",
      },
      { status: 503 },
    );
  }

  const intentHeader = request.headers.get("x-qurbani-upload-intent")?.trim();
  if (!intentHeader) {
    return NextResponse.json(
      { error: "Missing upload intent", messageBn: "আপলোড টোকেন পাওয়া যায়নি।" },
      { status: 401 },
    );
  }

  const intent = verifyMobileUploadIntent(intentHeader);
  if (!intent) {
    return NextResponse.json(
      {
        error: "Invalid or expired upload intent",
        messageBn: "আপলোড টোকেন মেয়াদোত্তীর্ণ বা অবৈধ। আবার চেষ্টা করুন।",
      },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart body", messageBn: "ফাইল পাঠানো হয়নি।" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "file field required", messageBn: "ফাইল ফিল্ড আবশ্যক।" },
      { status: 400 },
    );
  }

  if (file.size > intent.max) {
    return NextResponse.json(
      {
        error: "File too large",
        messageBn: "ফাইলের আকার অনুমোতির চেয়ে বড়।",
      },
      { status: 400 },
    );
  }

  const rawType = (file.type || "").trim().toLowerCase();
  const effectiveType =
    rawType && rawType !== "application/octet-stream" ? rawType : intent.ct;

  if (!isAllowedMobileLeadMime(effectiveType)) {
    return NextResponse.json(
      {
        error: "Unsupported content type",
        messageBn: "এই ফাইল টাইপ অনুমোদিত নয়।",
      },
      { status: 400 },
    );
  }

  const intentCt = intent.ct.toLowerCase();
  if (effectiveType !== intentCt) {
    const looseImage =
      intentCt.startsWith("image/") && effectiveType.startsWith("image/");
    if (!looseImage) {
      return NextResponse.json(
        {
          error: "Content type mismatch",
          messageBn: "ফাইলের ধরন আগের অনুরোধের সাথে মিলছে না।",
        },
        { status: 400 },
      );
    }
  }

  const pathname = blobPathnameForMobileLeadUpload(file.name || "upload.bin");

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token,
      contentType: effectiveType,
      addRandomSuffix: false,
    });
    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: effectiveType,
    });
  } catch (e) {
    console.error("POST /api/mobile/media/ingest", e);
    return NextResponse.json(
      {
        error: "Upload failed",
        messageBn: "আপলোড ব্যর্থ হয়েছে। একটু পরে আবার চেষ্টা করুন।",
      },
      { status: 500 },
    );
  }
}
