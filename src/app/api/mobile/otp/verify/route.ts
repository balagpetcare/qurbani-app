import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import {
  OTP_CHALLENGE_EXPIRED_BN,
  OTP_CHALLENGE_NOT_FOUND_BN,
  OTP_CHALLENGE_USED_BN,
  OTP_CODE_FORMAT_BN,
  OTP_GENERIC_ERROR_BN,
  OTP_PHONE_INVALID_BN,
  OTP_PHONE_NOT_ELIGIBLE_BN,
  OTP_TOO_MANY_ATTEMPTS_BN,
  OTP_WRONG_CODE_BN,
} from "@/lib/mobile-customer-otp-messages";
import { prisma } from "@/lib/prisma";
import { normalizeBangladeshPhone } from "@/lib/phone";
import {
  assertMobileOtpVerifyAllowed,
  PUBLIC_RATE_LIMIT_MESSAGE_BN,
} from "@/lib/public-rate-limit";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
const MAX_OTP_ATTEMPTS = 5;
const OTP_CODE_RE = /^\d{6}$/;

type Body = {
  phone?: unknown;
  challengeId?: unknown;
  code?: unknown;
};

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
      { error: "Invalid JSON", messageBn: OTP_GENERIC_ERROR_BN },
      { status: 400 },
    );
  }

  const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
  const phoneCanon = normalizeBangladeshPhone(phoneRaw);
  if (!phoneCanon) {
    return NextResponse.json(
      { error: "INVALID_PHONE", messageBn: OTP_PHONE_INVALID_BN },
      { status: 400 },
    );
  }

  const challengeId =
    typeof body.challengeId === "string" ? body.challengeId.trim() : "";
  const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
  if (!challengeId) {
    return NextResponse.json(
      { error: "CHALLENGE_REQUIRED", messageBn: OTP_CHALLENGE_NOT_FOUND_BN },
      { status: 400 },
    );
  }
  if (!OTP_CODE_RE.test(codeRaw)) {
    return NextResponse.json(
      { error: "INVALID_CODE", messageBn: OTP_CODE_FORMAT_BN },
      { status: 400 },
    );
  }

  const rl = assertMobileOtpVerifyAllowed(request, phoneCanon);
  if (rl) {
    const text = await rl.text();
    let messageBn = PUBLIC_RATE_LIMIT_MESSAGE_BN;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (typeof j.error === "string" && j.error.length) messageBn = j.error;
    } catch {
      /* ignore */
    }
    return NextResponse.json(
      { error: "RATE_LIMIT", messageBn },
      { status: 429 },
    );
  }

  if (await phoneBlockedForCustomerOtp(phoneCanon)) {
    return NextResponse.json(
      { error: "PHONE_NOT_ELIGIBLE", messageBn: OTP_PHONE_NOT_ELIGIBLE_BN },
      { status: 403 },
    );
  }

  const challenge = await prisma.customerOtpChallenge.findFirst({
    where: { id: challengeId, phoneCanon },
  });

  if (!challenge) {
    return NextResponse.json(
      { error: "CHALLENGE_NOT_FOUND", messageBn: OTP_CHALLENGE_NOT_FOUND_BN },
      { status: 400 },
    );
  }

  if (challenge.consumedAt) {
    return NextResponse.json(
      { error: "CHALLENGE_USED", messageBn: OTP_CHALLENGE_USED_BN },
      { status: 400 },
    );
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "CHALLENGE_EXPIRED", messageBn: OTP_CHALLENGE_EXPIRED_BN },
      { status: 400 },
    );
  }

  if (challenge.attemptCount >= MAX_OTP_ATTEMPTS) {
    return NextResponse.json(
      { error: "TOO_MANY_ATTEMPTS", messageBn: OTP_TOO_MANY_ATTEMPTS_BN },
      { status: 400 },
    );
  }

  await prisma.customerOtpChallenge.update({
    where: { id: challenge.id },
    data: { attemptCount: { increment: 1 } },
  });

  const ok = await bcrypt.compare(codeRaw, challenge.codeHash);
  if (!ok) {
    const updated = await prisma.customerOtpChallenge.findUnique({
      where: { id: challenge.id },
      select: { attemptCount: true },
    });
    if (updated && updated.attemptCount >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: "TOO_MANY_ATTEMPTS", messageBn: OTP_TOO_MANY_ATTEMPTS_BN },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "WRONG_CODE", messageBn: OTP_WRONG_CODE_BN },
      { status: 400 },
    );
  }

  let userId: number;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.customerOtpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });

      const existing = await tx.user.findUnique({
        where: { phone: phoneCanon },
        select: { id: true, role: true },
      });

      if (existing) {
        if (existing.role !== UserRole.CUSTOMER) {
          throw new Error("non_customer_phone");
        }
        await tx.user.update({
          where: { id: existing.id },
          data: { phoneVerifiedAt: new Date() },
        });
        return existing.id;
      }

      const created = await tx.user.create({
        data: {
          name: "গ্রাহক",
          phone: phoneCanon,
          role: UserRole.CUSTOMER,
          phoneVerifiedAt: new Date(),
        },
        select: { id: true },
      });
      return created.id;
    });
    userId = result;
  } catch (e) {
    if (e instanceof Error && e.message === "non_customer_phone") {
      return NextResponse.json(
        { error: "PHONE_NOT_ELIGIBLE", messageBn: OTP_PHONE_NOT_ELIGIBLE_BN },
        { status: 403 },
      );
    }
    console.error("POST /api/mobile/otp/verify transaction", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", messageBn: OTP_GENERIC_ERROR_BN },
      { status: 500 },
    );
  }

  try {
    const token = await signAuthToken(
      { userId, role: "CUSTOMER" },
      SESSION_MAX_AGE_SEC,
    );
    const res = NextResponse.json({
      success: true,
      accessToken: token,
      tokenType: "Bearer",
      expiresInSec: SESSION_MAX_AGE_SEC,
    });
    res.cookies.set(
      AUTH_COOKIE_NAME,
      token,
      authCookieOptions(SESSION_MAX_AGE_SEC),
    );
    return res;
  } catch (err) {
    console.error("POST /api/mobile/otp/verify sign", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", messageBn: OTP_GENERIC_ERROR_BN },
      { status: 503 },
    );
  }
}
