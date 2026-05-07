import { LeadStatus, type AnimalKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { bangladeshPhoneDatabaseVariants } from "@/lib/phone";

export function leadPhoneWhereForCustomer(phoneCanon: string) {
  const variants = bangladeshPhoneDatabaseVariants(phoneCanon);
  return { phone: { in: variants } };
}

export type CustomerLeadListRow = {
  id: number;
  status: LeadStatus;
  createdAt: string;
  customerName: string;
  areaLabel: string;
  animalKind: AnimalKind | null;
  serviceRequirementPreview: string;
};

export type CustomerLeadDetail = CustomerLeadListRow & {
  whatsapp: string | null;
  address: string | null;
  problemDetails: string | null;
  message: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  priority: string;
  statusLabelBn: string;
  /** Full service requirement text (detail view). */
  serviceRequirement: string;
};

const STATUS_BN: Record<LeadStatus, string> = {
  NEW: "নতুন",
  ASSIGNED: "ডাক্তার নির্ধারিত",
  ACCEPTED: "গ্রহণ করা হয়েছে",
  IN_PROGRESS: "চিকিৎসা চলছে",
  OBSERVED: "পর্যবেক্ষণে",
  COMPLETED: "সম্পন্ন",
  FOLLOW_UP_NEEDED: "ফলো-আপ দরকার",
  CANCELLED: "বাতিল",
  REFERRED: "রেফার করা হয়েছে",
};

function preview(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export async function fetchCustomerLeadsForPhone(
  phoneCanon: string,
  take: number,
): Promise<CustomerLeadListRow[]> {
  const rows = await prisma.lead.findMany({
    where: leadPhoneWhereForCustomer(phoneCanon),
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      createdAt: true,
      customerName: true,
      area: true,
      areaId: true,
      selectedArea: { select: { name: true, nameBn: true } },
      animalKind: true,
      serviceRequirement: true,
    },
  });

  return rows.map((r) => {
    const areaLabel =
      r.areaId && r.selectedArea
        ? (r.selectedArea.nameBn?.trim() || r.selectedArea.name)
        : (r.area?.trim() || "");
    return {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      customerName: r.customerName,
      areaLabel,
      animalKind: r.animalKind,
      serviceRequirementPreview: preview(r.serviceRequirement, 160),
    };
  });
}

export async function fetchCustomerLeadDetailForPhone(
  phoneCanon: string,
  leadId: number,
): Promise<CustomerLeadDetail | null> {
  const row = await prisma.lead.findFirst({
    where: { id: leadId, ...leadPhoneWhereForCustomer(phoneCanon) },
    select: {
      id: true,
      status: true,
      createdAt: true,
      customerName: true,
      area: true,
      areaId: true,
      selectedArea: { select: { name: true, nameBn: true } },
      animalKind: true,
      serviceRequirement: true,
      whatsapp: true,
      address: true,
      problemDetails: true,
      message: true,
      preferredDate: true,
      preferredTime: true,
      priority: true,
    },
  });
  if (!row) return null;

  const areaLabel =
    row.areaId && row.selectedArea
      ? (row.selectedArea.nameBn?.trim() || row.selectedArea.name)
      : (row.area?.trim() || "");

  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    customerName: row.customerName,
    areaLabel,
    animalKind: row.animalKind,
    serviceRequirementPreview: preview(row.serviceRequirement, 400),
    serviceRequirement: row.serviceRequirement,
    whatsapp: row.whatsapp,
    address: row.address,
    problemDetails: row.problemDetails,
    message: row.message,
    preferredDate: row.preferredDate?.toISOString() ?? null,
    preferredTime: row.preferredTime,
    priority: String(row.priority),
    statusLabelBn: STATUS_BN[row.status] ?? row.status,
  };
}
