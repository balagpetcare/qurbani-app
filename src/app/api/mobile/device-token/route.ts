import { NextResponse } from "next/server";

import { PushDevicePlatform } from "@/generated/prisma/enums";
import { getClientIp } from "@/lib/client-ip";
import { requireDoctorOrCustomerFromRequest } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import {
  PUBLIC_RATE_LIMIT_MESSAGE_BN,
  tryConsumeAllRateLimits,
} from "@/lib/public-rate-limit";

const TOKEN_MAX = 4096;

type Body = {
  token?: unknown;
  platform?: unknown;
};

function parsePlatform(raw: string): PushDevicePlatform | null {
  const p = raw.trim().toLowerCase();
  if (p === "android") return PushDevicePlatform.ANDROID;
  if (p === "ios") return PushDevicePlatform.IOS;
  return null;
}

function assertDeviceTokenPostRateOk(request: Request): boolean {
  const ip = getClientIp(request);
  return tryConsumeAllRateLimits([
    {
      key: `device-token:ip:${ip}`,
      limit: Number(process.env.PUBLIC_DEVICE_TOKEN_RATE_IP_LIMIT ?? 120),
      windowMs: Number(process.env.PUBLIC_DEVICE_TOKEN_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
}

export async function POST(request: Request) {
  const auth = await requireDoctorOrCustomerFromRequest(request);
  if (!auth.ok) return auth.response;

  if (!assertDeviceTokenPostRateOk(request)) {
    return NextResponse.json(
      { error: "RATE_LIMIT", messageBn: PUBLIC_RATE_LIMIT_MESSAGE_BN },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", messageBn: "অবৈধ অনুরোধ।" },
      { status: 400 },
    );
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platformRaw = typeof body.platform === "string" ? body.platform : "";
  const platform = parsePlatform(platformRaw);

  if (!token || token.length > TOKEN_MAX) {
    return NextResponse.json(
      { error: "INVALID_TOKEN", messageBn: "ডিভাইস টোকেন সঠিক নয়।" },
      { status: 400 },
    );
  }
  if (!platform) {
    return NextResponse.json(
      {
        error: "INVALID_PLATFORM",
        messageBn: "প্ল্যাটফর্ম android অথবা ios দিন।",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.pushDeviceToken.upsert({
      where: { token },
      create: {
        userId: auth.userId,
        platform,
        token,
      },
      update: {
        userId: auth.userId,
        platform,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/mobile/device-token", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", messageBn: "সংরক্ষণ করা যায়নি।" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireDoctorOrCustomerFromRequest(request);
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", messageBn: "অবৈধ অনুরোধ।" },
      { status: 400 },
    );
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length > TOKEN_MAX) {
    return NextResponse.json(
      { error: "INVALID_TOKEN", messageBn: "ডিভাইস টোকেন সঠিক নয়।" },
      { status: 400 },
    );
  }

  try {
    const res = await prisma.pushDeviceToken.deleteMany({
      where: { token, userId: auth.userId },
    });
    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (e) {
    console.error("DELETE /api/mobile/device-token", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", messageBn: "মুছে ফেলা যায়নি।" },
      { status: 500 },
    );
  }
}
