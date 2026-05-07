import type { Prisma } from "@/generated/prisma/client";
import { LeadStatus, UserRole } from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";
import {
  publicCustomerAreaOrderBy,
  publicCustomerAreaWhere,
} from "@/lib/public-areas";
import { toPublicDoctorCard, type PublicDoctorCard } from "@/lib/public-doctor";

export type LandingAreaChip = {
  id: number;
  name: string;
  nameBn: string | null;
  nameEn: string | null;
  isPopular: boolean;
};

/** @deprecated Prefer {@link PublicDoctorCard} from `@/lib/public-doctor`. */
export type DoctorPreview = PublicDoctorCard;

const publicDoctorSelect = {
  id: true,
  name: true,
  experienceSummary: true,
  profilePhotoUrl: true,
  qualification: true,
  shortBio: true,
  availabilityStatus: true,
  homeVisitFeeMin: true,
  homeVisitFeeMax: true,
  feeNote: true,
  availableTimeText: true,
  doctorAreas: {
    select: { area: { select: { name: true, nameBn: true } } },
  },
} satisfies Prisma.UserSelect;

type PublicDoctorDbRow = Prisma.UserGetPayload<{ select: typeof publicDoctorSelect }>;

export async function getLandingAreas(): Promise<LandingAreaChip[]> {
  return prisma.area.findMany({
    where: publicCustomerAreaWhere,
    orderBy: publicCustomerAreaOrderBy,
    select: {
      id: true,
      name: true,
      nameBn: true,
      nameEn: true,
      isPopular: true,
    },
  });
}

export async function getDoctorPreviews(limit = 4): Promise<PublicDoctorCard[]> {
  const doctors = await prisma.user.findMany({
    where: { role: UserRole.DOCTOR, isActive: true },
    take: limit,
    orderBy: { name: "asc" },
    select: publicDoctorSelect,
  });

  const ids = doctors.map((d) => d.id);
  const completed =
    ids.length === 0
      ? []
      : await prisma.lead.groupBy({
          by: ["assignedDoctorId"],
          where: {
            status: LeadStatus.COMPLETED,
            assignedDoctorId: { in: ids },
          },
          _count: { _all: true },
        });

  const byId = new Map(
    completed.map((r) => [r.assignedDoctorId as number, r._count._all]),
  );

  return doctors.map((d: PublicDoctorDbRow) =>
    toPublicDoctorCard(
      {
        id: d.id,
        name: d.name,
        experienceSummary: d.experienceSummary,
        profilePhotoUrl: d.profilePhotoUrl,
        qualification: d.qualification,
        shortBio: d.shortBio,
        availabilityStatus: d.availabilityStatus,
        homeVisitFeeMin: d.homeVisitFeeMin,
        homeVisitFeeMax: d.homeVisitFeeMax,
        feeNote: d.feeNote,
        availableTimeText: d.availableTimeText,
        doctorAreas: d.doctorAreas,
      },
      byId.get(d.id) ?? 0,
      { mode: "preview" },
    ),
  );
}

/** Public directory listing — never selects phone/WhatsApp/email/password/notes. */
export async function getPublicDoctorDirectory(options: {
  search?: string;
  areaId?: number;
  limit?: number;
}): Promise<PublicDoctorCard[]> {
  const take = Math.min(Math.max(options.limit ?? 80, 1), 120);
  const search = options.search?.trim();

  const where: Prisma.UserWhereInput = {
    role: UserRole.DOCTOR,
    isActive: true,
    ...(search
      ? {
          name: { contains: search, mode: "insensitive" },
        }
      : {}),
    ...(options.areaId
      ? {
          doctorAreas: { some: { areaId: options.areaId } },
        }
      : {}),
  };

  const doctors = await prisma.user.findMany({
    where,
    take,
    orderBy: { name: "asc" },
    select: publicDoctorSelect,
  });

  const ids = doctors.map((d) => d.id);
  const completed =
    ids.length === 0
      ? []
      : await prisma.lead.groupBy({
          by: ["assignedDoctorId"],
          where: {
            status: LeadStatus.COMPLETED,
            assignedDoctorId: { in: ids },
          },
          _count: { _all: true },
        });

  const byId = new Map(
    completed.map((r) => [r.assignedDoctorId as number, r._count._all]),
  );

  return doctors.map((d: PublicDoctorDbRow) =>
    toPublicDoctorCard(
      {
        id: d.id,
        name: d.name,
        experienceSummary: d.experienceSummary,
        profilePhotoUrl: d.profilePhotoUrl,
        qualification: d.qualification,
        shortBio: d.shortBio,
        availabilityStatus: d.availabilityStatus,
        homeVisitFeeMin: d.homeVisitFeeMin,
        homeVisitFeeMax: d.homeVisitFeeMax,
        feeNote: d.feeNote,
        availableTimeText: d.availableTimeText,
        doctorAreas: d.doctorAreas,
      },
      byId.get(d.id) ?? 0,
      { mode: "directory" },
    ),
  );
}

export async function getPublicDoctorById(
  id: number,
): Promise<PublicDoctorCard | null> {
  const d = await prisma.user.findFirst({
    where: { id, role: UserRole.DOCTOR, isActive: true },
    select: publicDoctorSelect,
  });
  if (!d) return null;

  const done = await prisma.lead.count({
    where: { assignedDoctorId: d.id, status: LeadStatus.COMPLETED },
  });

  return toPublicDoctorCard(
    {
      id: d.id,
      name: d.name,
      experienceSummary: d.experienceSummary,
      profilePhotoUrl: d.profilePhotoUrl,
      qualification: d.qualification,
      shortBio: d.shortBio,
      availabilityStatus: d.availabilityStatus,
      homeVisitFeeMin: d.homeVisitFeeMin,
      homeVisitFeeMax: d.homeVisitFeeMax,
      feeNote: d.feeNote,
      availableTimeText: d.availableTimeText,
      doctorAreas: d.doctorAreas,
    },
    done,
    { mode: "directory" },
  );
}

/** Curated anonymized stories for landing — never includes customer PII. */
export type PublicShowcaseCase = {
  title: string;
  summary: string;
  areaLabel: string;
  whenLabel: string;
};

export async function getPublicShowcaseCases(
  limit = 6,
): Promise<PublicShowcaseCase[]> {
  const rows = await prisma.leadCaseReport.findMany({
    where: {
      publicShowcaseEligible: true,
      completedAt: { not: null },
      showcaseSummary: { not: null },
    },
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      showcaseTitle: true,
      showcaseSummary: true,
      completedAt: true,
      lead: {
        select: {
          selectedArea: { select: { nameBn: true, name: true } },
        },
      },
    },
  });

  return rows
    .filter((r) => (r.showcaseSummary?.trim().length ?? 0) >= 10)
    .map((r) => ({
      title: r.showcaseTitle?.trim() || "সম্পন্ন কেস",
      summary: r.showcaseSummary!.trim(),
      areaLabel:
        r.lead.selectedArea?.nameBn?.trim() ||
        r.lead.selectedArea?.name?.trim() ||
        "এলাকা",
      whenLabel: r.completedAt
        ? r.completedAt.toLocaleDateString("bn-BD", {
            year: "numeric",
            month: "short",
          })
        : "",
    }));
}
