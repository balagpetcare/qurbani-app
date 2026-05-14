import type { Prisma } from "@/generated/prisma/client";
import { LeadStatus, UserRole } from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";
import { formatLeadAnimalDisplay, formatLeadProblemCategory } from "@/lib/lead-display";
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
    select: { area: { select: { id: true, name: true, nameBn: true } } },
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

export async function getDoctorPreviews(
  limit = 4,
  options?: { cardMode?: "preview" | "directory" },
): Promise<PublicDoctorCard[]> {
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

  const mode = options?.cardMode ?? "preview";

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
      { mode },
    ),
  );
}

/** Start of calendar day in Asia/Dhaka (for “today” counters). */
export function startOfTodayDhaka(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${day}T00:00:00+06:00`);
}

/** Real metrics for landing trust blocks (extend / replace with analytics later). */
export type LandingHomeStats = {
  doctorCount: number;
  activeTreatments: number;
  todayRequests: number;
  completedServices: number;
  visitsScheduledToday: number;
};

const ACTIVE_TREATMENT_STATUSES: LeadStatus[] = [
  LeadStatus.ASSIGNED,
  LeadStatus.ACCEPTED,
  LeadStatus.IN_PROGRESS,
  LeadStatus.OBSERVED,
  LeadStatus.FOLLOW_UP_NEEDED,
];

export async function getLandingHomeStats(): Promise<LandingHomeStats> {
  const start = startOfTodayDhaka();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [
    doctorCount,
    activeTreatments,
    todayRequests,
    completedServices,
    visitsScheduledToday,
  ] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.DOCTOR, isActive: true } }),
    prisma.lead.count({ where: { status: { in: ACTIVE_TREATMENT_STATUSES } } }),
    prisma.lead.count({ where: { createdAt: { gte: start } } }),
    prisma.lead.count({ where: { status: LeadStatus.COMPLETED } }),
    prisma.lead.count({
      where: {
        preferredDate: { gte: start, lt: end },
        status: { notIn: [LeadStatus.CANCELLED] },
      },
    }),
  ]);

  return {
    doctorCount,
    activeTreatments,
    todayRequests,
    completedServices,
    visitsScheduledToday,
  };
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
  /** Assigned doctor display name when safe to show; otherwise null. */
  doctorLabel?: string | null;
  /** Short treatment context (species / problem), no customer PII. */
  treatmentTypeLabel?: string | null;
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
          assignedDoctor: { select: { name: true } },
          animalKind: true,
          animalType: true,
          problemCategory: true,
        },
      },
    },
  });

  return rows
    .filter((r) => (r.showcaseSummary?.trim().length ?? 0) >= 10)
    .map((r) => {
      const lead = r.lead;
      const animal = formatLeadAnimalDisplay(lead.animalKind, lead.animalType);
      const prob = formatLeadProblemCategory(lead.problemCategory);
      const parts = [
        animal !== "—" ? animal : null,
        prob !== "—" ? prob : null,
      ].filter(Boolean) as string[];
      const treatmentTypeLabel = parts.length ? parts.join(" · ") : null;
      return {
        title: r.showcaseTitle?.trim() || "সম্পন্ন কেস",
        summary: r.showcaseSummary!.trim(),
        areaLabel:
          lead.selectedArea?.nameBn?.trim() ||
          lead.selectedArea?.name?.trim() ||
          "এলাকা",
        whenLabel: r.completedAt
          ? r.completedAt.toLocaleDateString("bn-BD", {
              year: "numeric",
              month: "short",
            })
          : "",
        doctorLabel: lead.assignedDoctor?.name?.trim() || null,
        treatmentTypeLabel,
      };
    });
}
