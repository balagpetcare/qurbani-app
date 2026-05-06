import type { LeadStatus } from "@/generated/prisma/enums";
import { LeadStatus as LeadStatusEnum } from "@/generated/prisma/enums";
import { formatLeadProblemCategory } from "@/lib/lead-display";
import { isLeadStatusTerminal } from "@/lib/lead-workflow";

/** Customer / location fields that must not leak to unauthorized doctors. */
export const LEAD_SENSITIVE_SCALAR_KEYS = [
  "phone",
  "whatsapp",
  "address",
  "googleMapUrl",
  "message",
] as const;

export type LeadPrivacyDoctorContext = {
  doctorUserId: number;
};

export function canDoctorViewLeadCustomerContact(
  doctorUserId: number,
  lead: { assignedDoctorId: number | null },
): boolean {
  return (
    lead.assignedDoctorId != null && lead.assignedDoctorId === doctorUserId
  );
}

export function doctorCanMutateLeadCase(
  doctorUserId: number,
  lead: { assignedDoctorId: number | null },
): boolean {
  return lead.assignedDoctorId === doctorUserId;
}

/**
 * Pool self-claim (matches `POST .../accept` preconditions for NEW + unassigned).
 */
export function doctorCanClaimPoolLead(
  _doctorUserId: number,
  lead: {
    assignedDoctorId: number | null;
    status: LeadStatus;
  },
): boolean {
  return (
    lead.assignedDoctorId == null &&
    lead.status === LeadStatusEnum.NEW &&
    !isLeadStatusTerminal(lead.status)
  );
}

export function doctorCanAcceptAdminAssignedLead(
  doctorUserId: number,
  lead: { assignedDoctorId: number | null; status: LeadStatus },
): boolean {
  return (
    lead.assignedDoctorId === doctorUserId &&
    lead.status === LeadStatusEnum.ASSIGNED &&
    !isLeadStatusTerminal(lead.status)
  );
}

/** Short line for lead lists (no PII). */
export function leadProblemSummaryShort(lead: {
  problemCategory: string | null;
  problemDetails: string | null;
  serviceRequirement: string;
}): string {
  const cat = formatLeadProblemCategory(lead.problemCategory);
  const detail = lead.problemDetails?.trim();
  if (detail) {
    return detail.length > 80 ? `${cat} · ${detail.slice(0, 80)}…` : `${cat} · ${detail}`;
  }
  const svc = lead.serviceRequirement?.trim();
  if (!svc) return cat;
  return svc.length > 100 ? `${cat} · ${svc.slice(0, 100)}…` : `${cat} · ${svc}`;
}

type JsonRecord = Record<string, unknown>;

function redactAssignedDoctorForDoctorApi(
  doc: JsonRecord | null | undefined,
): JsonRecord | null {
  if (!doc || typeof doc !== "object") return null;
  return {
    id: doc.id,
    name: doc.name,
  };
}

/**
 * Deep-clone via JSON and strip sensitive scalars on the lead root.
 * Clears notes/observations for doctors without contact (may contain PII).
 */
export function sanitizeDoctorLeadDetailJson(
  leadUnknown: unknown,
  viewer: LeadPrivacyDoctorContext,
): JsonRecord {
  const lead = structuredClone(leadUnknown) as JsonRecord;
  const assignedId = lead.assignedDoctorId as number | null | undefined;
  const canContact =
    assignedId != null && assignedId === viewer.doctorUserId;

  if (!canContact) {
    for (const k of LEAD_SENSITIVE_SCALAR_KEYS) {
      delete lead[k];
    }
    lead.notes = [];
    lead.observations = [];
  }

  const ad = lead.assignedDoctor;
  if (ad && typeof ad === "object") {
    lead.assignedDoctor = redactAssignedDoctorForDoctorApi(
      ad as JsonRecord,
    );
  }

  return lead;
}

export function buildDoctorLeadListRow(
  row: {
    id: number;
    customerName: string;
    status: LeadStatus;
    createdAt: Date;
    updatedAt?: Date;
    area?: string | null;
    animalType?: string | null;
    animalKind?: import("@/generated/prisma/enums").AnimalKind | null;
    animalCount?: number | null;
    priority: import("@/generated/prisma/enums").LeadPriority;
    problemCategory?: string | null;
    problemDetails?: string | null;
    serviceRequirement: string;
    assignedDoctorId: number | null;
    selectedArea?: { id: number; name: string; slug: string } | null;
    assignedDoctor?: { id: number; name: string } | null;
  },
  viewerDoctorId: number,
) {
  const isPeerLocked =
    row.assignedDoctorId != null && row.assignedDoctorId !== viewerDoctorId;

  return {
    id: row.id,
    customerName: row.customerName,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    area: row.area,
    animalType: row.animalType,
    animalKind: row.animalKind,
    animalCount: row.animalCount,
    priority: row.priority,
    problemCategory: row.problemCategory,
    problemSummary: leadProblemSummaryShort({
      problemCategory: row.problemCategory ?? null,
      problemDetails: row.problemDetails ?? null,
      serviceRequirement: row.serviceRequirement,
    }),
    assignedDoctorId: row.assignedDoctorId,
    selectedArea: row.selectedArea,
    assignedDoctor: row.assignedDoctor
      ? { id: row.assignedDoctor.id, name: row.assignedDoctor.name }
      : null,
    isMine: row.assignedDoctorId === viewerDoctorId,
    isPeerLocked,
    canClaimPool: isPeerLocked
      ? false
      : doctorCanClaimPoolLead(viewerDoctorId, {
          assignedDoctorId: row.assignedDoctorId,
          status: row.status,
        }),
    canAcceptAssigned: isPeerLocked
      ? false
      : doctorCanAcceptAdminAssignedLead(viewerDoctorId, {
          assignedDoctorId: row.assignedDoctorId,
          status: row.status,
        }),
  };
}

/** Admin/staff list API — no customer phone or WhatsApp in payload. */
export function buildAdminLeadListRow(row: {
  id: number;
  customerName: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt?: Date;
  area?: string | null;
  animalType?: string | null;
  animalKind?: import("@/generated/prisma/enums").AnimalKind | null;
  animalCount?: number | null;
  priority: import("@/generated/prisma/enums").LeadPriority;
  problemCategory?: string | null;
  problemDetails?: string | null;
  serviceRequirement: string;
  assignedDoctorId?: number | null;
  source?: string | null;
  utmCampaign?: string | null;
  isPossibleDuplicate?: boolean;
  duplicateOfLeadId?: number | null;
  assignedDoctor?: { id: number; name: string } | null;
  selectedArea?: { id: number; name: string; slug: string } | null;
}) {
  return {
    id: row.id,
    customerName: row.customerName,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    area: row.area,
    animalType: row.animalType,
    animalKind: row.animalKind,
    animalCount: row.animalCount,
    priority: row.priority,
    problemCategory: row.problemCategory,
    problemSummary: leadProblemSummaryShort({
      problemCategory: row.problemCategory ?? null,
      problemDetails: row.problemDetails ?? null,
      serviceRequirement: row.serviceRequirement,
    }),
    assignedDoctorId: row.assignedDoctorId ?? null,
    source: row.source,
    utmCampaign: row.utmCampaign,
    isPossibleDuplicate: row.isPossibleDuplicate,
    duplicateOfLeadId: row.duplicateOfLeadId,
    assignedDoctor: row.assignedDoctor,
    selectedArea: row.selectedArea,
  };
}
