import type { Prisma } from "@/generated/prisma/client";

import { LeadContactPreference, UserRole, TreatmentCompletionStatus } from "@/generated/prisma/enums";
import {
  type AdminDoctorFinanceClosureMode,
  type AdminDoctorFinanceQuery,
  buildAdminDoctorFinanceBillingWhere,
  buildAdminFinanceLeadWhere,
} from "@/lib/admin-doctor-finance-query";
import { prisma } from "@/lib/prisma";

export type {
  AdminDoctorFinanceClosureMode,
  AdminDoctorFinanceQuery,
} from "@/lib/admin-doctor-finance-query";

export {
  buildAdminDoctorFinanceBillingWhere,
  parseAdminDoctorFinanceParams,
  serializeAdminDoctorFinanceQuery,
} from "@/lib/admin-doctor-finance-query";

export type AdminDoctorFinanceDoctorRow = {
  doctorId: number;
  doctorName: string;
  doctorPhone: string | null;
  areaCoverageLabel: string;
  completedCaseCount: number;
  homeVisitCount: number;
  totalCollectedFromCustomer: number;
  totalMedicineCost: number;
  totalTravelCost: number;
  percentageBaseAmount: number;
  doctorEarnedAmount: number;
  adminCompanyAmount: number;
};

export type AdminDoctorFinanceListResult = {
  rows: AdminDoctorFinanceDoctorRow[];
  grandTotals: {
    completedCaseCount: number;
    totalCollectedFromCustomer: number;
    totalMedicineCost: number;
    totalTravelCost: number;
    doctorEarnedAmount: number;
    adminCompanyAmount: number;
  };
  meta: {
    page: number;
    limit: number;
    totalDoctorRows: number;
    totalPages: number;
    closure: AdminDoctorFinanceClosureMode;
  };
};

export type AdminDoctorFinanceCaseRow = {
  billingId: number;
  leadId: number;
  completedAt: string;
  treatmentClosureStatus: TreatmentCompletionStatus;
  customerName: string;
  customerPhone: string;
  areaLabel: string;
  totalCollectedFromCustomer: number;
  medicineCost: number;
  travelCost: number;
  percentageBaseAmount: number;
  doctorEarnedAmount: number;
  adminCompanyAmount: number;
  invoiceNo: string;
};

export type AdminDoctorFinanceDetailResult = {
  doctor: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    areaCoverageLabel: string;
  };
  totals: AdminDoctorFinanceListResult["grandTotals"] & {
    homeVisitCount: number;
    percentageBaseAmount: number;
  };
  cases: AdminDoctorFinanceCaseRow[];
  meta: { page: number; limit: number; totalCases: number; totalPages: number };
};

function nz(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Doctors to include: undefined = all doctors (no id restriction).
 * Empty array = no matching doctors (caller returns empty result).
 */
async function resolveDoctorIdScope(q: AdminDoctorFinanceQuery): Promise<number[] | undefined> {
  if (q.doctorId != null) {
    const u = await prisma.user.findFirst({
      where: { id: q.doctorId, role: UserRole.DOCTOR },
      select: { id: true },
    });
    return u ? [u.id] : [];
  }
  if (q.search.length > 0) {
    const matches = await prisma.user.findMany({
      where: {
        role: UserRole.DOCTOR,
        OR: [
          { name: { contains: q.search, mode: "insensitive" } },
          { phone: { contains: q.search } },
        ],
      },
      select: { id: true },
    });
    return matches.map((m) => m.id);
  }
  return undefined;
}

function visitLeadWhere(q: AdminDoctorFinanceQuery): Prisma.LeadWhereInput {
  return {
    ...buildAdminFinanceLeadWhere(q),
    preferredContact: LeadContactPreference.VISIT,
  };
}

async function coverageLabelsForDoctors(
  doctorIds: number[],
): Promise<Map<number, string>> {
  if (doctorIds.length === 0) return new Map();
  const rows = await prisma.doctorArea.findMany({
    where: { userId: { in: doctorIds } },
    select: {
      userId: true,
      areaId: true,
      area: { select: { nameBn: true, name: true } },
    },
    orderBy: [{ userId: "asc" }, { areaId: "asc" }],
  });
  const labelsByDoctor = new Map<number, string[]>();
  for (const r of rows) {
    const label = r.area.nameBn?.trim() || r.area.name;
    const arr = labelsByDoctor.get(r.userId) ?? [];
    arr.push(label);
    labelsByDoctor.set(r.userId, arr);
  }
  const out = new Map<number, string>();
  for (const id of doctorIds) {
    const arr = labelsByDoctor.get(id);
    out.set(id, arr?.length ? arr.join(", ") : "—");
  }
  return out;
}

export async function fetchAdminDoctorFinanceList(
  q: AdminDoctorFinanceQuery,
): Promise<AdminDoctorFinanceListResult> {
  const doctorScope = await resolveDoctorIdScope(q);
  if (doctorScope !== undefined && doctorScope.length === 0) {
    return {
      rows: [],
      grandTotals: {
        completedCaseCount: 0,
        totalCollectedFromCustomer: 0,
        totalMedicineCost: 0,
        totalTravelCost: 0,
        doctorEarnedAmount: 0,
        adminCompanyAmount: 0,
      },
      meta: {
        page: q.page,
        limit: q.limit,
        totalDoctorRows: 0,
        totalPages: 1,
        closure: q.closure,
      },
    };
  }

  const billingWhere = buildAdminDoctorFinanceBillingWhere(q, doctorScope);

  const [groups, visitGroups, grand] = await Promise.all([
    prisma.leadCaseBilling.groupBy({
      by: ["doctorId"],
      where: billingWhere,
      _count: { id: true },
      _sum: {
        totalCollected: true,
        medicineCharge: true,
        transportCharge: true,
        commissionableAmount: true,
        doctorEarningAmount: true,
        platformCommissionAmount: true,
      },
    }),
    prisma.leadCaseBilling.groupBy({
      by: ["doctorId"],
      where: {
        ...billingWhere,
        lead: visitLeadWhere(q),
      },
      _count: { id: true },
    }),
    prisma.leadCaseBilling.aggregate({
      where: billingWhere,
      _count: { id: true },
      _sum: {
        totalCollected: true,
        medicineCharge: true,
        transportCharge: true,
        doctorEarningAmount: true,
        platformCommissionAmount: true,
      },
    }),
  ]);

  const visitByDoctor = new Map<number, number>();
  for (const v of visitGroups) {
    visitByDoctor.set(v.doctorId, v._count.id);
  }

  const doctorIdsUnsorted = groups.map((g) => g.doctorId);
  const doctors = await prisma.user.findMany({
    where: { id: { in: doctorIdsUnsorted }, role: UserRole.DOCTOR },
    select: { id: true, name: true, phone: true },
  });
  const doctorMap = new Map(doctors.map((d) => [d.id, d]));
  const coverageMap = await coverageLabelsForDoctors(doctorIdsUnsorted);

  const enriched: AdminDoctorFinanceDoctorRow[] = [];
  for (const g of groups) {
    const d = doctorMap.get(g.doctorId);
    if (!d) continue;
    const sums = g._sum;
    enriched.push({
      doctorId: g.doctorId,
      doctorName: d.name,
      doctorPhone: d.phone,
      areaCoverageLabel: coverageMap.get(g.doctorId) ?? "—",
      completedCaseCount: g._count.id,
      homeVisitCount: visitByDoctor.get(g.doctorId) ?? 0,
      totalCollectedFromCustomer: nz(sums.totalCollected),
      totalMedicineCost: nz(sums.medicineCharge),
      totalTravelCost: nz(sums.transportCharge),
      percentageBaseAmount: nz(sums.totalCollected),
      doctorEarnedAmount: nz(sums.doctorEarningAmount),
      adminCompanyAmount: nz(sums.platformCommissionAmount),
    });
  }

  enriched.sort((a, b) => a.doctorName.localeCompare(b.doctorName, "bn"));

  const totalDoctorRows = enriched.length;
  const totalPages = Math.max(1, Math.ceil(totalDoctorRows / q.limit));
  const effectivePage = Math.min(q.page, totalPages);
  const skip = (effectivePage - 1) * q.limit;
  const rows = enriched.slice(skip, skip + q.limit);

  const gSum = grand._sum;
  return {
    rows,
    grandTotals: {
      completedCaseCount: grand._count.id,
      totalCollectedFromCustomer: nz(gSum.totalCollected),
      totalMedicineCost: nz(gSum.medicineCharge),
      totalTravelCost: nz(gSum.transportCharge),
      doctorEarnedAmount: nz(gSum.doctorEarningAmount),
      adminCompanyAmount: nz(gSum.platformCommissionAmount),
    },
    meta: {
      page: effectivePage,
      limit: q.limit,
      totalDoctorRows,
      totalPages,
      closure: q.closure,
    },
  };
}

export async function fetchAdminDoctorFinanceDetail(
  doctorUserId: number,
  q: AdminDoctorFinanceQuery,
): Promise<AdminDoctorFinanceDetailResult | null> {
  const doctor = await prisma.user.findFirst({
    where: { id: doctorUserId, role: UserRole.DOCTOR },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isActive: true,
    },
  });
  if (!doctor) return null;

  const doctorScope = [doctorUserId];
  const billingWhere: Prisma.LeadCaseBillingWhereInput = {
    ...buildAdminDoctorFinanceBillingWhere(q, doctorScope),
    doctorId: doctorUserId,
  };

  const [grand, visitCount, totalCases] = await Promise.all([
    prisma.leadCaseBilling.aggregate({
      where: billingWhere,
      _count: { id: true },
      _sum: {
        totalCollected: true,
        medicineCharge: true,
        transportCharge: true,
        doctorEarningAmount: true,
        platformCommissionAmount: true,
      },
    }),
    prisma.leadCaseBilling.count({
      where: {
        ...billingWhere,
        lead: visitLeadWhere(q),
      },
    }),
    prisma.leadCaseBilling.count({ where: billingWhere }),
  ]);

  const casePage = Math.max(1, q.page);
  const caseLimit = Math.min(100, Math.max(1, q.limit));
  const caseTotalPages = Math.max(1, Math.ceil(totalCases / caseLimit));
  const effectiveCasePage = Math.min(casePage, caseTotalPages);
  const skip = (effectiveCasePage - 1) * caseLimit;

  const billings = await prisma.leadCaseBilling.findMany({
    where: billingWhere,
    orderBy: { completedAt: "desc" },
    skip,
    take: caseLimit,
    select: {
      id: true,
      leadId: true,
      completedAt: true,
      status: true,
      invoiceNo: true,
      totalCollected: true,
      medicineCharge: true,
      transportCharge: true,
      commissionableAmount: true,
      doctorEarningAmount: true,
      platformCommissionAmount: true,
      lead: {
        select: {
          customerName: true,
          phone: true,
          area: true,
          selectedArea: { select: { nameBn: true, name: true } },
        },
      },
    },
  });

  const areaCoverageLabel =
    (await coverageLabelsForDoctors([doctorUserId])).get(doctorUserId) ?? "—";
  const gSum = grand._sum;

  const cases: AdminDoctorFinanceCaseRow[] = billings.map((b) => {
    const areaLabel =
      b.lead.selectedArea?.nameBn?.trim() ||
      b.lead.selectedArea?.name ||
      b.lead.area?.trim() ||
      "—";
    return {
      billingId: b.id,
      leadId: b.leadId,
      completedAt: b.completedAt.toISOString(),
      treatmentClosureStatus: b.status,
      customerName: b.lead.customerName,
      customerPhone: b.lead.phone,
      areaLabel,
      totalCollectedFromCustomer: b.totalCollected,
      medicineCost: b.medicineCharge,
      travelCost: b.transportCharge,
      percentageBaseAmount: b.totalCollected,
      doctorEarnedAmount: b.doctorEarningAmount,
      adminCompanyAmount: b.platformCommissionAmount,
      invoiceNo: b.invoiceNo,
    };
  });

  return {
    doctor: {
      id: doctor.id,
      name: doctor.name,
      phone: doctor.phone,
      email: doctor.email,
      isActive: doctor.isActive,
      areaCoverageLabel,
    },
    totals: {
      completedCaseCount: grand._count.id,
      totalCollectedFromCustomer: nz(gSum.totalCollected),
      totalMedicineCost: nz(gSum.medicineCharge),
      totalTravelCost: nz(gSum.transportCharge),
      doctorEarnedAmount: nz(gSum.doctorEarningAmount),
      adminCompanyAmount: nz(gSum.platformCommissionAmount),
      homeVisitCount: visitCount,
      percentageBaseAmount: nz(gSum.totalCollected),
    },
    cases,
    meta: {
      page: effectiveCasePage,
      limit: caseLimit,
      totalCases,
      totalPages: caseTotalPages,
    },
  };
}
