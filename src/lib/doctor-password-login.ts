import bcrypt from "bcryptjs";

import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { normalizeBangladeshPhone } from "@/lib/phone";

export type DoctorPasswordLoginOk = { userId: number };
export type DoctorPasswordLoginFail = { error: string; status: number };

/**
 * Shared credential check for web cookie login and mobile token login.
 */
export async function authenticateDoctorWithPassword(
  identifier: string,
  password: string,
): Promise<DoctorPasswordLoginOk | DoctorPasswordLoginFail> {
  if (!identifier || !password) {
    return {
      error: "Email or phone and password are required.",
      status: 400,
    };
  }

  try {
    let user:
      | { id: number; passwordHash: string | null; role: UserRole }
      | null = null;

    if (identifier.includes("@")) {
      user = await prisma.user.findFirst({
        where: {
          email: { equals: identifier.toLowerCase(), mode: "insensitive" },
          role: UserRole.DOCTOR,
          isActive: true,
        },
        select: { id: true, passwordHash: true, role: true },
      });
    } else {
      const phoneNorm = normalizeBangladeshPhone(identifier);
      const or: { phone: string }[] = [];
      if (phoneNorm) {
        or.push({ phone: phoneNorm });
        or.push({ phone: `880${phoneNorm.slice(1)}` });
      }
      or.push({ phone: identifier });
      user = await prisma.user.findFirst({
        where: {
          role: UserRole.DOCTOR,
          isActive: true,
          OR: or,
        },
        select: { id: true, passwordHash: true, role: true },
      });
    }

    if (!user?.passwordHash) {
      return { error: "Invalid email/phone or password.", status: 401 };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return { error: "Invalid email/phone or password.", status: 401 };
    }

    return { userId: user.id };
  } catch (err) {
    console.error("authenticateDoctorWithPassword", err);
    return { error: "Login temporarily unavailable.", status: 503 };
  }
}
