import { cookies } from "next/headers";

import { UserRole } from "@/generated/prisma/enums";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";

/** Logged-in admin portal user (ADMIN or STAFF), or null. */
export async function getAdminPortalUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(token);
  if (!payload || (payload.role !== "ADMIN" && payload.role !== "STAFF")) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true, name: true },
  });
  if (
    !user?.isActive ||
    (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF)
  ) {
    return null;
  }
  return user;
}

export async function getMainAdminOnlyUser() {
  const u = await getAdminPortalUser();
  if (!u || u.role !== UserRole.ADMIN) return null;
  return u;
}
