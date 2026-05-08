import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import { mobileApiErrorBody } from "@/lib/api-json-response";
import { sendCustomerOtpSmsIfConfigured } from "@/lib/customer-otp-sms";
import {
  OTP_GENERIC_ERROR_BN,
  OTP_PHONE_INVALID_BN,
  OTP_PHONE_NOT_ELIGIBLE_BN,
  OTP_RATE_LIMIT_BN,
  OTP_SENT_DEV_BN,
  OTP_SENT_HINT_BN,
} from "@/lib/mobile-customer-otp-messages";
import { assertOtpSendDbRules } from "@/lib/otp-rate-guard";
import { prisma } from "@/lib/prisma";
import { normalizeBangladeshPhone } from "@/lib/phone";
import { assertMobileOtpStartAllowed } from "@/lib/public-rate-limit";

const OTP_TTL_MS = 5 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

type Body = { phone?: unknown };

function isDevNodeEnv(): boolean {
  return process.env.NODE_ENV !== "production";
}

function devRevealOtpEnabled(): boolean {
  return isDevNodeEnv() && process.env.MOBILE_OTP_DEV_REVEAL === "1";
}

async function phoneBlockedForCustomerOtp(phoneCanon: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { phone: phoneCanon },
    select: { role: true },
  });
  if (!u) return false;
  return u.role !== UserRole.CUSTOMER;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      mobileApiErrorBody("INVALID_JSON", OTP_GENERIC_ERROR_BN, "Invalid JSON"),
      { status: 400 },
    );
  }

  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  const phoneCanon = normalizeBangladeshPhone(phoneRaw);
  if (!phoneCanon) {
    return NextResponse.json(mobileApiErrorBody("INVALID_PHONE", OTP_PHONE_INVALID_BN), {
      status: 400,
    });
  }

  const rl = assertMobileOtpStartAllowed(request, phoneCanon);
  if (rl) {
    return NextResponse.json(
      mobileApiErrorBody("RATE_LIMIT", OTP_RATE_LIMIT_BN, "Rate limited"),
      { status: 429 },
    );
  }

  const dbRl = await assertOtpSendDbRules(phoneCanon);
  if (!dbRl.ok) {
    return NextResponse.json(
      mobileApiErrorBody("RATE_LIMIT", dbRl.messageBn, "Rate limited"),
      { status: 429 },
    );
  }

  if (await phoneBlockedForCustomerOtp(phoneCanon)) {
    return NextResponse.json(
      mobileApiErrorBody("PHONE_NOT_ELIGIBLE", OTP_PHONE_NOT_ELIGIBLE_BN),
      { status: 403 },
    );
  }

  const plainCode = String(randomInt(100_000, 1_000_000));
  const codeHash = await bcrypt.hash(plainCode, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  let challenge;
  try {
    challenge = await prisma.customerOtpChallenge.create({
      data: {
        phoneCanon,
        codeHash,
        expiresAt,
      },
      select: { id: true },
    });
  } catch (e) {
    console.error("POST /api/mobile/otp/start", e);
    return NextResponse.json(mobileApiErrorBody("SERVER_ERROR", OTP_GENERIC_ERROR_BN), {
      status: 500,
    });
  }

  let smsReason: "disabled" | "missing_env" | "ok" | "http_error" | "dry_run" =
    "disabled";
  try {
    const r = await sendCustomerOtpSmsIfConfigured(phoneCanon, plainCode);
    smsReason = r.reason;
  } catch (e) {
    console.error("POST /api/mobile/otp/start sms", e);
    smsReason = "http_error";
  }

  if (isDevNodeEnv()) {
    console.info(
      `[customer-otp][dev] phone=${phoneCanon.slice(0, 4)}… challenge=${challenge.id} sms=${smsReason}`,
    );
  }

  const payload: Record<string, unknown> = {
    ok: true,
    challengeId: challenge.id,
    expiresInSec: Math.floor(OTP_TTL_MS / 1000),
    messageBn:
      smsReason === "ok"
        ? OTP_SENT_HINT_BN
        : smsReason === "dry_run" && isDevNodeEnv()
          ? OTP_SENT_DEV_BN
          : OTP_SENT_HINT_BN,
  };

  if (devRevealOtpEnabled()) {
    payload.devOtp = plainCode;
  }

  return NextResponse.json(payload, { status: 200 });
}
