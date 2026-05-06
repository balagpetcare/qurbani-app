import { NextResponse } from "next/server";

import {
  LeadPriority,
  LeadStatus,
  NotificationChannel,
  NotificationType,
  PaymentMethod,
  SettlementStatus,
  TreatmentCompletionStatus,
} from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import {
  billingValidationIssuesToBn,
  buildInvoiceNo,
  computeBillingDerivedAmounts,
  treatmentCompletionStatusToLeadStatus,
  validateBillingAmountInput,
} from "@/lib/billing-calculations";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import { appendLeadStatusHistory, isLeadStatusTerminal } from "@/lib/lead-workflow";
import { logOps } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import {
  getBillingPlatformCommissionRatePercent,
  getDoctorInAppNotificationsEnabled,
} from "@/lib/site-settings";
import { asTrimmedString } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

const CAN_COMPLETE_FROM: LeadStatus[] = [
  LeadStatus.IN_PROGRESS,
  LeadStatus.OBSERVED,
];

const TREATMENT_STATUS_VALUES = Object.values(
  TreatmentCompletionStatus,
) as TreatmentCompletionStatus[];

function parsePaymentMethod(raw: unknown): PaymentMethod | null {
  if (typeof raw !== "string") return null;
  return (Object.values(PaymentMethod) as string[]).includes(raw)
    ? (raw as PaymentMethod)
    : null;
}

function parseTreatmentCompletionStatus(raw: unknown): TreatmentCompletionStatus | null {
  if (typeof raw !== "string") return null;
  return TREATMENT_STATUS_VALUES.includes(raw as TreatmentCompletionStatus)
    ? (raw as TreatmentCompletionStatus)
    : null;
}

function parseNonNegativeInt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = parseInt(raw.trim(), 10);
    if (!Number.isNaN(n) && Number.isInteger(n) && n >= 0) return n;
  }
  return null;
}

function parseCommissionRate(raw: unknown, fallback: number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  const can = await doctorCanAccessLead(auth.user.id, id);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const defaultRate = await getBillingPlatformCommissionRatePercent();
  const rateSnapshot = parseCommissionRate(body.platformCommissionRatePercent, defaultRate);

  const treatmentCompletionStatus = parseTreatmentCompletionStatus(
    body.treatmentCompletionStatus,
  );
  if (!treatmentCompletionStatus) {
    return NextResponse.json(
      { error: "চিকিৎসা সমাপ্তির অবস্থা নির্বাচন করুন" },
      { status: 400 },
    );
  }

  const observation = asTrimmedString(body.observation);
  const diagnosis = asTrimmedString(body.diagnosis);
  const treatmentNote = asTrimmedString(body.treatmentNote);
  const medicinesUsed = asTrimmedString(body.medicinesUsed);
  const doctorNote = asTrimmedString(body.doctorNote);

  const doctorAdvice = doctorNote ?? asTrimmedString(body.doctorAdvice);
  const treatmentGiven = treatmentNote;
  const medicineAdvice = medicinesUsed ?? asTrimmedString(body.medicineAdvice);

  const serviceFee = parseNonNegativeInt(body.serviceFee);
  const medicineCharge = parseNonNegativeInt(body.medicineCharge);
  const transportCharge = parseNonNegativeInt(body.transportCharge);
  const emergencyCharge = parseNonNegativeInt(body.emergencyCharge);
  const otherCharge = parseNonNegativeInt(body.otherCharge);
  const discountAmount = parseNonNegativeInt(body.discountAmount);
  const totalCollected = parseNonNegativeInt(body.totalCollected);

  if (serviceFee === null || medicineCharge === null || transportCharge === null) {
    return NextResponse.json(
      { error: "সার্ভিস ফি, ঔষধ ও পরিবহন চার্জ সঠিক সংখ্যায় দিন" },
      { status: 400 },
    );
  }
  if (emergencyCharge === null || otherCharge === null || discountAmount === null) {
    return NextResponse.json(
      { error: "জরুরি, অন্যান্য চার্জ ও ছাড় সঠিক সংখ্যায় দিন" },
      { status: 400 },
    );
  }
  if (totalCollected === null) {
    return NextResponse.json(
      { error: "মোট গৃহীত টাকা সঠিক সংখ্যায় দিন" },
      { status: 400 },
    );
  }

  const paymentMethod = parsePaymentMethod(body.paymentMethod);
  if (!paymentMethod) {
    return NextResponse.json({ error: "পেমেন্ট পদ্ধতি নির্বাচন করুন" }, { status: 400 });
  }

  const followUpRequested =
    typeof body.followUpRequired === "boolean"
      ? body.followUpRequired
      : Boolean(body.followUpRequired);

  const followUpStored =
    followUpRequested ||
    treatmentCompletionStatus === TreatmentCompletionStatus.FOLLOW_UP_NEEDED;

  let nextFollowUpAt: Date | null = null;
  if (followUpStored) {
    const raw = asTrimmedString(body.nextFollowUpAt);
    if (!raw) {
      return NextResponse.json(
        { error: "ফলো-আপ লাগলে তারিখ ও সময় দিন" },
        { status: 400 },
      );
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "ফলো-আপের তারিখ সঠিক নয়" }, { status: 400 });
    }
    nextFollowUpAt = d;
  }

  const publicShowcaseEligible = Boolean(body.publicShowcaseEligible);
  const showcaseTitle = asTrimmedString(body.showcaseTitle);
  const showcaseSummary = asTrimmedString(body.showcaseSummary);

  if (!diagnosis || diagnosis.length < 2) {
    return NextResponse.json({ error: "নির্ণয় (diagnosis) পূরণ করুন" }, { status: 400 });
  }
  if (!treatmentGiven || treatmentGiven.length < 2) {
    return NextResponse.json({ error: "চিকিৎসা বিবরণ লিখুন" }, { status: 400 });
  }

  if (treatmentCompletionStatus === TreatmentCompletionStatus.FOLLOW_UP_NEEDED) {
    if (!followUpStored || !nextFollowUpAt) {
      return NextResponse.json(
        {
          error:
            "'ফলোআপ প্রয়োজন' নির্বাচন করলে ফলোআপ চেক ও তারিখ দিন",
        },
        { status: 400 },
      );
    }
  }

  if (publicShowcaseEligible) {
    if (!showcaseSummary || showcaseSummary.length < 10) {
      return NextResponse.json(
        {
          error:
            "পাবলিক শোকেসের জন্য সংক্ষিপ্ত বিবরণ লিখুন (নাম/ফোন ছাড়া, সাধারণ ভাষায়)",
        },
        { status: 400 },
      );
    }
  }

  const billingInput = {
    serviceFee,
    medicineCharge,
    transportCharge,
    emergencyCharge,
    otherCharge,
    discountAmount,
    totalCollected,
    platformCommissionRatePercent: rateSnapshot,
    paymentMethod,
  };

  const billingCheck = validateBillingAmountInput(billingInput);
  if (!billingCheck.ok) {
    const msgs = billingValidationIssuesToBn(billingCheck.issues);
    return NextResponse.json({ error: msgs[0] ?? "বিলিং তথ্য সঠিক নয়" }, { status: 400 });
  }

  const derived = computeBillingDerivedAmounts(billingInput);
  const nextLeadStatus = treatmentCompletionStatusToLeadStatus(treatmentCompletionStatus);

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedDoctorId: true,
        priority: true,
        caseReport: true,
        caseBilling: true,
      },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.assignedDoctorId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isLeadStatusTerminal(lead.status)) {
      return NextResponse.json({ error: "এই লিড ইতিমধ্যে সমাপ্ত অবস্থায় আছে" }, { status: 400 });
    }
    if (!CAN_COMPLETE_FROM.includes(lead.status)) {
      return NextResponse.json(
        { error: "চিকিৎসা শুরুর পর সম্পন্ন করা যাবে" },
        { status: 400 },
      );
    }
    if (lead.caseReport?.completedAt || lead.caseBilling) {
      return NextResponse.json(
        { error: "ইতিমধ্যে সমাপ্ত বা বিলিং সংরক্ষিত" },
        { status: 400 },
      );
    }

    const now = new Date();
    const em =
      lead.priority === LeadPriority.EMERGENCY ? "[জরুরি / EMERGENCY] " : "";

    const invoiceNo = buildInvoiceNo(id, now);

    const doctorNotifOn = await getDoctorInAppNotificationsEnabled();

    await prisma.$transaction(async (tx) => {
      await tx.leadCaseReport.upsert({
        where: { leadId: id },
        create: {
          leadId: id,
          observation: observation ?? null,
          doctorAdvice: doctorAdvice ?? null,
          diagnosis,
          treatmentGiven,
          medicineAdvice: medicineAdvice ?? null,
          followUpNeeded: followUpStored,
          nextFollowUpAt,
          publicShowcaseEligible,
          showcaseTitle: showcaseTitle ?? null,
          showcaseSummary: showcaseSummary ?? null,
          completedAt: now,
          completedByDoctorId: auth.user.id,
        },
        update: {
          observation: observation ?? null,
          doctorAdvice: doctorAdvice ?? null,
          diagnosis,
          treatmentGiven,
          medicineAdvice: medicineAdvice ?? null,
          followUpNeeded: followUpStored,
          nextFollowUpAt,
          publicShowcaseEligible,
          showcaseTitle: showcaseTitle ?? null,
          showcaseSummary: showcaseSummary ?? null,
          completedAt: now,
          completedByDoctorId: auth.user.id,
        },
      });

      await tx.leadCaseBilling.create({
        data: {
          leadId: id,
          doctorId: auth.user.id,
          completedAt: now,
          status: treatmentCompletionStatus,
          observation: observation ?? null,
          diagnosis,
          treatmentNote: treatmentGiven,
          medicinesUsed: medicineAdvice ?? null,
          serviceFee,
          medicineCharge,
          transportCharge,
          emergencyCharge,
          otherCharge,
          discountAmount,
          grossAmount: derived.grossAmount,
          totalCollected,
          dueAmount: derived.dueAmount,
          paymentMethod,
          commissionableAmount: derived.commissionableAmount,
          platformCommissionRate: rateSnapshot,
          platformCommissionAmount: derived.platformCommissionAmount,
          doctorEarningAmount: derived.doctorEarningAmount,
          doctorPayableToPlatform: derived.doctorPayableToPlatform,
          settlementStatus: SettlementStatus.UNSETTLED,
          followUpRequired: followUpStored,
          followUpAt: nextFollowUpAt,
          invoiceNo,
        },
      });

      await tx.lead.update({
        where: { id },
        data: { status: nextLeadStatus },
      });

      await appendLeadStatusHistory(tx, {
        leadId: id,
        fromStatus: lead.status,
        toStatus: nextLeadStatus,
        actorKind: "DOCTOR",
        actorUserId: auth.user.id,
      });

      await tx.leadNote.create({
        data: {
          leadId: id,
          note: `কেস সমাপ্তি ও বিলিং — ডাঃ ${auth.user.name} (${invoiceNo})`,
          createdBy: `doctor:${auth.user.id}`,
        },
      });

      if (doctorNotifOn) {
        await tx.notification.create({
          data: {
            type: NotificationType.STATUS_CHANGED,
            channel: NotificationChannel.IN_APP,
            leadId: id,
            message: `${em}লিড #${id}: সমাপ্তি (${nextLeadStatus}) — ইনভয়েস ${invoiceNo}`,
          },
        });
      }

      if (doctorNotifOn && followUpStored && nextFollowUpAt) {
        await tx.notification.create({
          data: {
            type: NotificationType.FOLLOW_UP,
            channel: NotificationChannel.IN_APP,
            leadId: id,
            message: `${em}লিড #${id}: ফলো-আপ (${nextFollowUpAt.toISOString().slice(0, 10)})`,
          },
        });
      }
    });

    logOps("doctor_case_completed", {
      leadId: id,
      doctorUserId: auth.user.id,
      priority: lead.priority,
      emergency: lead.priority === LeadPriority.EMERGENCY,
      publicShowcaseEligible,
      invoiceNo,
      leadStatus: nextLeadStatus,
      treatmentCompletionStatus,
    });

    return NextResponse.json({
      success: true,
      invoiceNo,
      leadStatus: nextLeadStatus,
    });
  } catch (err) {
    console.error("POST /api/doctor/leads/[id]/complete", err);
    return NextResponse.json(
      { error: "সমাপ্তি সংরক্ষণ ব্যর্থ হয়েছে" },
      { status: 500 },
    );
  }
}
