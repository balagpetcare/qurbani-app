import bcrypt from "bcryptjs";

import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { normalizeBangladeshPhone } from "@/lib/phone";

export type DoctorPasswordLoginOk = { userId: number };
export type DoctorPasswordLoginFail = {
  error: string;
  messageBn: string;
  status: number;
};

const MSG_BAD_CREDENTIALS_BN =
  "ইমেইল, ফোন বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।";
const MSG_INACTIVE_BN =
  "এই অ্যাকাউন্ট নিষ্ক্রিয় বা অনুমোদিত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।";
const MSG_NO_PASSWORD_BN =
  "এই অ্যাকাউন্টে পাসওয়ার্ড সেট নেই। অ্যাডমিন প্যানেল থেকে পাসওয়ার্ড যোগ করুন।";
const MSG_REQUIRED_BN = "ইমেইল/ফোন ও পাসওয়ার্ড দিন।";
const MSG_UNAVAILABLE_BN =
  "লগইন সাময়িকভাবে অনুপলব্ধ। একটু পরে আবার চেষ্টা করুন।";

/**
 * True when [trimmed] should be treated as a DB user id, not a Bangladesh mobile.
 * (11-digit locals start with 01…; 13-digit +880…; 10-digit national 1… normalizes to mobile.)
 */
function looksLikeDoctorUserId(trimmed: string): boolean {
  if (!/^\d+$/.test(trimmed)) return false;
  if (trimmed.length >= 11) return false;
  if (trimmed.length === 10 && trimmed.startsWith("1")) return false;
  const n = parseInt(trimmed, 10);
  return n > 0 && n <= 2_147_483_647;
}

async function findDoctorUserForLogin(identifier: string): Promise<
  | { id: number; passwordHash: string | null; role: UserRole; isActive: boolean }
  | null
> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return prisma.user.findFirst({
      where: {
        email: { equals: trimmed.toLowerCase(), mode: "insensitive" },
        role: UserRole.DOCTOR,
      },
      select: { id: true, passwordHash: true, role: true, isActive: true },
    });
  }

  const phoneNorm = normalizeBangladeshPhone(trimmed);
  const or: { phone: string }[] = [];
  if (phoneNorm) {
    or.push({ phone: phoneNorm });
    or.push({ phone: `880${phoneNorm.slice(1)}` });
  }
  or.push({ phone: trimmed });

  const byPhone = await prisma.user.findFirst({
    where: {
      role: UserRole.DOCTOR,
      OR: or,
    },
    select: { id: true, passwordHash: true, role: true, isActive: true },
  });
  if (byPhone) return byPhone;

  if (looksLikeDoctorUserId(trimmed)) {
    const id = parseInt(trimmed, 10);
    return prisma.user.findFirst({
      where: { id, role: UserRole.DOCTOR },
      select: { id: true, passwordHash: true, role: true, isActive: true },
    });
  }

  return null;
}

/**
 * Shared credential check for web cookie login and mobile token login.
 */
export async function authenticateDoctorWithPassword(
  identifier: string,
  password: string,
): Promise<DoctorPasswordLoginOk | DoctorPasswordLoginFail> {
  if (!identifier.trim() || !password) {
    return {
      error: "MISSING_FIELDS",
      messageBn: MSG_REQUIRED_BN,
      status: 400,
    };
  }

  try {
    const user = await findDoctorUserForLogin(identifier);

    if (!user) {
      return {
        error: "INVALID_CREDENTIALS",
        messageBn: MSG_BAD_CREDENTIALS_BN,
        status: 401,
      };
    }

    if (!user.isActive) {
      return {
        error: "ACCOUNT_DISABLED",
        messageBn: MSG_INACTIVE_BN,
        status: 403,
      };
    }

    if (!user.passwordHash) {
      return {
        error: "PASSWORD_NOT_SET",
        messageBn: MSG_NO_PASSWORD_BN,
        status: 401,
      };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return {
        error: "INVALID_CREDENTIALS",
        messageBn: MSG_BAD_CREDENTIALS_BN,
        status: 401,
      };
    }

    return { userId: user.id };
  } catch (err) {
    console.error("authenticateDoctorWithPassword", err);
    return {
      error: "SERVICE_UNAVAILABLE",
      messageBn: MSG_UNAVAILABLE_BN,
      status: 503,
    };
  }
}
