import { cookies } from "next/headers";

import {
  DoctorAreaPreferenceStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";

export async function getLoggedInDoctor() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(token);
  if (!payload || payload.role !== "DOCTOR") return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      phone: true,
      whatsapp: true,
      email: true,
      role: true,
      isActive: true,
      emergencyAvailable: true,
      areaCoverage: true,
      notes: true,
      qualification: true,
      experienceSummary: true,
      shortBio: true,
      availableTimeText: true,
      availabilityStatus: true,
      profilePhotoUrl: true,
      notifyEmail: true,
      notifySms: true,
      notifyWhatsApp: true,
      doctorAreas: {
        select: {
          area: { select: { id: true, name: true, slug: true, nameBn: true } },
        },
      },
      doctorAreaPreferenceRequests: {
        where: { status: DoctorAreaPreferenceStatus.PENDING },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, requestedAreaIds: true, createdAt: true },
      },
    },
  });

  if (!user || user.role !== UserRole.DOCTOR || !user.isActive) return null;
  return user;
}
