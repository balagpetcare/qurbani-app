import { LeadContactPreference } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type DoctorFinanceRecentRow = {
  leadId: number;
  invoiceNo: string;
  completedAt: string;
  status: string;
  customerName: string;
  totalCollectedFromCustomer: number;
  medicineCost: number;
  travelCost: number;
  doctorEarnedAmount: number;
  isHomeVisitPreference: boolean;
};

export type DoctorFinanceSummary = {
  completedCaseCount: number;
  homeVisitOrCompletedVisitCount: number;
  totalCollectedFromCustomer: number;
  totalMedicineCost: number;
  totalTravelCost: number;
  percentageBaseAmount: number;
  totalDoctorEarnedAmount: number;
  platformCommissionRatePercentHint: number | null;
  recentCases: DoctorFinanceRecentRow[];
};

const RECENT_LIMIT = 25;

function nz(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Aggregates billing rows for one doctor. Caller must enforce auth (logged-in doctor only).
 */
export async function buildDoctorFinanceSummary(
  doctorUserId: number,
  platformCommissionRatePercentHint: number | null,
): Promise<DoctorFinanceSummary> {
  const [agg, homeVisitOrCompletedVisitCount, recentBillings] = await Promise.all([
    prisma.leadCaseBilling.aggregate({
      where: { doctorId: doctorUserId },
      _count: { id: true },
      _sum: {
        totalCollected: true,
        medicineCharge: true,
        transportCharge: true,
        commissionableAmount: true,
        doctorEarningAmount: true,
      },
    }),
    prisma.leadCaseBilling.count({
      where: {
        doctorId: doctorUserId,
        lead: { preferredContact: LeadContactPreference.VISIT },
      },
    }),
    prisma.leadCaseBilling.findMany({
      where: { doctorId: doctorUserId },
      select: {
        leadId: true,
        completedAt: true,
        invoiceNo: true,
        status: true,
        totalCollected: true,
        medicineCharge: true,
        transportCharge: true,
        doctorEarningAmount: true,
        lead: {
          select: {
            customerName: true,
            preferredContact: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: RECENT_LIMIT,
    }),
  ]);

  const recentCases: DoctorFinanceRecentRow[] = recentBillings.map((b) => ({
    leadId: b.leadId,
    invoiceNo: b.invoiceNo,
    completedAt: b.completedAt.toISOString(),
    status: b.status,
    customerName: b.lead.customerName,
    totalCollectedFromCustomer: b.totalCollected,
    medicineCost: b.medicineCharge,
    travelCost: b.transportCharge,
    doctorEarnedAmount: b.doctorEarningAmount,
    isHomeVisitPreference: b.lead.preferredContact === LeadContactPreference.VISIT,
  }));

  const sums = agg._sum;

  return {
    completedCaseCount: agg._count.id,
    homeVisitOrCompletedVisitCount,
    totalCollectedFromCustomer: nz(sums.totalCollected),
    totalMedicineCost: nz(sums.medicineCharge),
    totalTravelCost: nz(sums.transportCharge),
    percentageBaseAmount: nz(sums.commissionableAmount),
    totalDoctorEarnedAmount: nz(sums.doctorEarningAmount),
    platformCommissionRatePercentHint,
    recentCases,
  };
}
