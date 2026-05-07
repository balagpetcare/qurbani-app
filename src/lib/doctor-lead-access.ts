import type { Prisma } from "@/generated/prisma/client";
import { LeadPriority, LeadStatus } from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";

export type DoctorAreaNameSnapshot = {
  name: string;
  nameBn: string | null;
  nameEn: string | null;
};

/** Collect unique substrings for loose matching on free-text `Lead.area` (custom এলাকা). */
export function collectAreaTextMatchFragments(
  areas: DoctorAreaNameSnapshot[],
): string[] {
  const out = new Set<string>();
  for (const a of areas) {
    for (const raw of [a.nameBn, a.nameEn, a.name]) {
      const t = raw?.trim();
      if (t && t.length >= 2) out.add(t);
    }
  }
  return [...out];
}

function customAreaVisibilityClauses(
  doctorUserId: number,
  fragments: string[],
): Prisma.LeadWhereInput[] {
  if (fragments.length === 0) return [];

  const textOr: Prisma.LeadWhereInput[] = fragments.map((f) => ({
    area: { contains: f, mode: "insensitive" },
  }));

  return [
    {
      AND: [
        { assignedDoctorId: null },
        { areaId: null },
        { area: { not: null } },
        { OR: textOr },
      ],
    },
    {
      AND: [
        { assignedDoctorId: { not: null } },
        { assignedDoctorId: { not: doctorUserId } },
        { areaId: null },
        { area: { not: null } },
        { OR: textOr },
      ],
    },
  ];
}

/**
 * Same rules as {@link buildDoctorLeadWhere}, for callers that already have area ids
 * (e.g. admin reports). Includes peer-assigned leads in listed areas.
 */
export function doctorLeadVisibilityWhereFromAreaIds(
  doctorUserId: number,
  areaIds: number[],
  textMatchFragments: string[] = [],
): Prisma.LeadWhereInput {
  const assignedToMe: Prisma.LeadWhereInput = {
    assignedDoctorId: doctorUserId,
  };

  const or: Prisma.LeadWhereInput[] = [assignedToMe];

  if (areaIds.length > 0) {
    or.push({
      AND: [{ assignedDoctorId: null }, { areaId: { in: areaIds } }],
    });
    /** Peer leads in shared areas: visible as redacted previews (no contact). */
    or.push({
      AND: [
        { assignedDoctorId: { not: null } },
        { assignedDoctorId: { not: doctorUserId } },
        { areaId: { in: areaIds } },
      ],
    });
  }

  or.push(...customAreaVisibilityClauses(doctorUserId, textMatchFragments));

  return { OR: or };
}

/**
 * Area-based visibility for doctors:
 * - Leads **assigned** to this doctor (any area).
 * - **Unassigned** leads whose `areaId` is in the doctor's `DoctorArea` list.
 * - **Custom-area** leads (`areaId` null) when `Lead.area` loosely matches a covered area label.
 * - Leads **assigned to another doctor** in those same areas (privacy-safe list/detail
 *   previews — contact fields are stripped server-side until the viewer is assignee).
 */
export async function buildDoctorLeadWhere(
  doctorUserId: number,
): Promise<Prisma.LeadWhereInput> {
  const rows = await prisma.doctorArea.findMany({
    where: { userId: doctorUserId },
    select: {
      areaId: true,
      area: { select: { name: true, nameBn: true, nameEn: true } },
    },
  });
  const fragments = collectAreaTextMatchFragments(rows.map((r) => r.area));
  return doctorLeadVisibilityWhereFromAreaIds(
    doctorUserId,
    rows.map((a) => a.areaId),
    fragments,
  );
}

/** Default list order: newest first (priority is surfaced via badges/filters). */
export const doctorLeadListOrderBy: Prisma.LeadOrderByWithRelationInput[] = [
  { createdAt: "desc" },
];

export type DoctorLeadsTab =
  | "all"
  | "mine"
  | "pool"
  | "emergency"
  | "completed"
  | "new"
  | "active";

export function parseDoctorLeadsTab(raw: string | undefined): DoctorLeadsTab {
  const t = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (
    t === "mine" ||
    t === "pool" ||
    t === "emergency" ||
    t === "completed" ||
    t === "new" ||
    t === "active"
  ) {
    return t;
  }
  return "all";
}

export function parseDoctorLeadsAreaId(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = parseInt(raw.trim(), 10);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return n;
}

export function mergeDoctorLeadListFilters(
  base: Prisma.LeadWhereInput,
  tab: DoctorLeadsTab,
  doctorUserId: number,
): Prisma.LeadWhereInput {
  if (tab === "all") return base;

  const parts: Prisma.LeadWhereInput[] = [base];

  if (tab === "mine") {
    parts.push({ assignedDoctorId: doctorUserId });
  } else if (tab === "pool") {
    parts.push({ assignedDoctorId: null });
  } else if (tab === "emergency") {
    parts.push({ priority: LeadPriority.EMERGENCY });
  } else if (tab === "completed") {
    parts.push({
      status: { in: [LeadStatus.COMPLETED, LeadStatus.FOLLOW_UP_NEEDED] },
    });
  } else if (tab === "new") {
    parts.push({ status: LeadStatus.NEW });
  } else if (tab === "active") {
    parts.push({
      status: {
        in: [
          LeadStatus.ASSIGNED,
          LeadStatus.ACCEPTED,
          LeadStatus.IN_PROGRESS,
          LeadStatus.OBSERVED,
        ],
      },
    });
  }

  return { AND: parts };
}

/**
 * Same visibility as {@link doctorLeadVisibilityWhereFromAreaIds} but excludes
 * peer-assigned leads so performance counts stay actionable-only.
 */
export function doctorLeadActionableVisibilityWhereFromAreaIds(
  doctorUserId: number,
  areaIds: number[],
  textMatchFragments: string[] = [],
): Prisma.LeadWhereInput {
  return {
    AND: [
      doctorLeadVisibilityWhereFromAreaIds(
        doctorUserId,
        areaIds,
        textMatchFragments,
      ),
      {
        OR: [{ assignedDoctorId: doctorUserId }, { assignedDoctorId: null }],
      },
    ],
  };
}

export function mergeDoctorLeadAreaFilter(
  where: Prisma.LeadWhereInput,
  areaId: number | undefined,
): Prisma.LeadWhereInput {
  if (areaId === undefined) return where;
  return { AND: [where, { areaId }] };
}

export async function doctorCanAccessLead(
  doctorUserId: number,
  leadId: number,
): Promise<boolean> {
  const where = await buildDoctorLeadWhere(doctorUserId);
  const n = await prisma.lead.count({
    where: {
      id: leadId,
      ...where,
    },
  });
  return n > 0;
}

/**
 * Leads this doctor can act on (own + unassigned pool). Excludes peer-assigned
 * previews so dashboard counts stay meaningful.
 */
export async function buildDoctorActionableLeadWhere(
  doctorUserId: number,
): Promise<Prisma.LeadWhereInput> {
  const wide = await buildDoctorLeadWhere(doctorUserId);
  return {
    AND: [
      wide,
      {
        OR: [{ assignedDoctorId: doctorUserId }, { assignedDoctorId: null }],
      },
    ],
  };
}
