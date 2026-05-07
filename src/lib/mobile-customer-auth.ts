import { UserRole } from "@/generated/prisma/enums";
import { verifyAuthFromRequest } from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";

export type MobileCustomerAuthContext = {
  userId: number;
  phoneCanon: string | null;
  name: string;
  phoneVerified: boolean;
  email: string | null;
};

/**
 * Validates Bearer token role CUSTOMER + active user.
 * Phone may be null for social-first accounts until OTP linking is completed.
 */
export async function getMobileCustomerAuth(
  request: Request,
): Promise<MobileCustomerAuthContext | null> {
  const payload = await verifyAuthFromRequest(request);
  if (!payload || payload.role !== "CUSTOMER") return null;

  const user = await prisma.user.findFirst({
    where: {
      id: payload.sub,
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    select: { id: true, phone: true, name: true, phoneVerifiedAt: true, email: true },
  });

  if (!user) return null;

  return {
    userId: user.id,
    phoneCanon: user.phone,
    name: user.name,
    phoneVerified: user.phoneVerifiedAt != null,
    email: user.email,
  };
}
