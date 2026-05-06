"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppCard } from "@/components/ui/AppCard";
import {
  LeadStatus,
  PaymentMethod,
  SettlementStatus,
  TreatmentCompletionStatus,
} from "@/generated/prisma/enums";
import {
  computeBillingDerivedAmounts,
  settlementPreviewLabelBn,
  type BillingAmountInput,
} from "@/lib/billing-calculations";

type CaseDraft = {
  observation: string | null;
  doctorAdvice: string | null;
  diagnosis: string | null;
  treatmentGiven: string | null;
  medicineAdvice: string | null;
  followUpNeeded: boolean;
  nextFollowUpAt: string | null;
  publicShowcaseEligible: boolean;
  showcaseTitle: string | null;
  showcaseSummary: string | null;
  completedAt: string | null;
};

export type DoctorBillingSnapshot = {
  invoiceNo: string;
  completedAt: string;
  status: TreatmentCompletionStatus;
  observation: string | null;
  diagnosis: string | null;
  treatmentNote: string | null;
  medicinesUsed: string | null;
  serviceFee: number;
  medicineCharge: number;
  transportCharge: number;
  emergencyCharge: number;
  otherCharge: number;
  discountAmount: number;
  grossAmount: number;
  totalCollected: number;
  dueAmount: number;
  paymentMethod: PaymentMethod;
  commissionableAmount: number;
  platformCommissionRate: number;
  platformCommissionAmount: number;
  doctorEarningAmount: number;
  doctorPayableToPlatform: number;
  settlementStatus: SettlementStatus;
  followUpRequired: boolean;
  followUpAt: string | null;
};

type Props = {
  leadId: number;
  doctorId: number;
  leadStatus: LeadStatus;
  assignedDoctorId: number | null;
  initialCase: CaseDraft | null;
  initialBilling: DoctorBillingSnapshot | null;
  platformCommissionRatePercent: number;
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTk(n: number): string {
  return `${n.toLocaleString("en-US")} ৳`;
}

const TREATMENT_LABELS: Record<TreatmentCompletionStatus, string> = {
  COMPLETED: "সম্পন্ন",
  FOLLOW_UP_NEEDED: "ফলোআপ প্রয়োজন",
  REFERRED: "রেফার করা",
  CANCELLED: "বাতিল (সমাপ্তি)",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "নগদ",
  BKASH: "bKash",
  NAGAD: "Nagad",
  BANK: "ব্যাংক",
  ONLINE: "অনলাইন",
  MIXED: "মিশ্র",
  DUE: "বাকি",
};

const SETTLEMENT_LABELS: Record<SettlementStatus, string> = {
  UNSETTLED: "অনিষ্পত্ত",
  PENDING_REVIEW: "পর্যালোচনাধীন",
  APPROVED: "অনুমোদিত",
  PAID_TO_PLATFORM: "প্ল্যাটফর্মে পরিশোধিত",
  PAID_TO_DOCTOR: "ডাক্তারকে পরিশোধিত",
  DISPUTED: "বিতর্কিত",
  CANCELLED: "বাতিল",
};

export function DoctorTreatmentBillingForm({
  leadId,
  doctorId,
  leadStatus,
  assignedDoctorId,
  initialCase,
  initialBilling,
  platformCommissionRatePercent,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isMine = assignedDoctorId === doctorId;
  const hasBilling = Boolean(initialBilling);
  const legacyCompleted = Boolean(initialCase?.completedAt) && !initialBilling;
  const locked = hasBilling || legacyCompleted;

  const terminal =
    leadStatus === LeadStatus.COMPLETED ||
    leadStatus === LeadStatus.FOLLOW_UP_NEEDED ||
    leadStatus === LeadStatus.CANCELLED ||
    leadStatus === LeadStatus.REFERRED;

  const canDraft =
    isMine &&
    !locked &&
    !terminal &&
    (leadStatus === LeadStatus.ACCEPTED ||
      leadStatus === LeadStatus.IN_PROGRESS ||
      leadStatus === LeadStatus.OBSERVED);

  const canSubmit =
    isMine &&
    !locked &&
    !terminal &&
    (leadStatus === LeadStatus.IN_PROGRESS || leadStatus === LeadStatus.OBSERVED);

  const [treatmentCompletionStatus, setTreatmentCompletionStatus] =
    useState<TreatmentCompletionStatus>(TreatmentCompletionStatus.COMPLETED);
  const [observation, setObservation] = useState(initialCase?.observation ?? "");
  const [diagnosis, setDiagnosis] = useState(initialCase?.diagnosis ?? "");
  const [treatmentNote, setTreatmentNote] = useState(initialCase?.treatmentGiven ?? "");
  const [medicinesUsed, setMedicinesUsed] = useState(initialCase?.medicineAdvice ?? "");
  const [doctorNote, setDoctorNote] = useState(initialCase?.doctorAdvice ?? "");

  const [serviceFee, setServiceFee] = useState("0");
  const [medicineCharge, setMedicineCharge] = useState("0");
  const [transportCharge, setTransportCharge] = useState("0");
  const [emergencyCharge, setEmergencyCharge] = useState("0");
  const [otherCharge, setOtherCharge] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [totalCollected, setTotalCollected] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

  const [followUpRequired, setFollowUpRequired] = useState(
    initialCase?.followUpNeeded ?? false,
  );
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    toDatetimeLocal(initialCase?.nextFollowUpAt ?? null),
  );

  const [publicShowcaseEligible, setPublicShowcaseEligible] = useState(
    initialCase?.publicShowcaseEligible ?? false,
  );
  const [showcaseTitle, setShowcaseTitle] = useState(initialCase?.showcaseTitle ?? "");
  const [showcaseSummary, setShowcaseSummary] = useState(
    initialCase?.showcaseSummary ?? "",
  );

  const parseNum = (s: string) => {
    const n = parseInt(s.trim(), 10);
    return Number.isNaN(n) || !Number.isInteger(n) || n < 0 ? null : n;
  };

  const billingPreviewInput: BillingAmountInput | null = useMemo(() => {
    const sf = parseNum(serviceFee);
    const mc = parseNum(medicineCharge);
    const tc = parseNum(transportCharge);
    const ec = parseNum(emergencyCharge);
    const oc = parseNum(otherCharge);
    const da = parseNum(discountAmount);
    const col = parseNum(totalCollected);
    if (
      sf === null ||
      mc === null ||
      tc === null ||
      ec === null ||
      oc === null ||
      da === null ||
      col === null
    ) {
      return null;
    }
    return {
      serviceFee: sf,
      medicineCharge: mc,
      transportCharge: tc,
      emergencyCharge: ec,
      otherCharge: oc,
      discountAmount: da,
      totalCollected: col,
      platformCommissionRatePercent,
      paymentMethod,
    };
  }, [
    serviceFee,
    medicineCharge,
    transportCharge,
    emergencyCharge,
    otherCharge,
    discountAmount,
    totalCollected,
    platformCommissionRatePercent,
    paymentMethod,
  ]);

  const preview = useMemo(() => {
    if (!billingPreviewInput) return null;
    return computeBillingDerivedAmounts(billingPreviewInput);
  }, [billingPreviewInput]);

  async function patchJson(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Request failed");
  }

  async function saveDraft() {
    await patchJson(`/api/doctor/leads/${leadId}/case-report`, {
      observation: observation.trim() || null,
      diagnosis: diagnosis.trim() || null,
      treatmentGiven: treatmentNote.trim() || null,
      medicineAdvice: medicinesUsed.trim() || null,
      doctorAdvice: doctorNote.trim() || null,
      followUpNeeded: followUpRequired,
      nextFollowUpAt: followUpRequired && nextFollowUpAt
        ? new Date(nextFollowUpAt).toISOString()
        : null,
    });
  }

  async function submitComplete() {
    const effectiveFollowUp =
      followUpRequired ||
      treatmentCompletionStatus === TreatmentCompletionStatus.FOLLOW_UP_NEEDED;

    if (effectiveFollowUp && !nextFollowUpAt) {
      throw new Error("ফলো-আপ লাগলে তারিখ ও সময় দিন");
    }
    if (treatmentCompletionStatus === TreatmentCompletionStatus.FOLLOW_UP_NEEDED) {
      if (!effectiveFollowUp || !nextFollowUpAt) {
        throw new Error("'ফলোআপ প্রয়োজন' নির্বাচন করলে ফলোআপ চেক ও তারিখ দিন");
      }
    }
    if (!diagnosis.trim() || diagnosis.trim().length < 2) {
      throw new Error("নির্ণয় (diagnosis) পূরণ করুন");
    }
    if (!treatmentNote.trim() || treatmentNote.trim().length < 2) {
      throw new Error("চিকিৎসা বিবরণ লিখুন");
    }
    if (publicShowcaseEligible && (!showcaseSummary.trim() || showcaseSummary.trim().length < 10)) {
      throw new Error(
        "পাবলিক শোকেসের জন্য সংক্ষিপ্ত বিবরণ লিখুন (নাম/ফোন ছাড়া)",
      );
    }

    const res = await fetch(`/api/doctor/leads/${leadId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        treatmentCompletionStatus,
        observation: observation.trim() || undefined,
        diagnosis: diagnosis.trim(),
        treatmentNote: treatmentNote.trim(),
        medicinesUsed: medicinesUsed.trim() || undefined,
        doctorNote: doctorNote.trim() || undefined,
        serviceFee: parseNum(serviceFee) ?? 0,
        medicineCharge: parseNum(medicineCharge) ?? 0,
        transportCharge: parseNum(transportCharge) ?? 0,
        emergencyCharge: parseNum(emergencyCharge) ?? 0,
        otherCharge: parseNum(otherCharge) ?? 0,
        discountAmount: parseNum(discountAmount) ?? 0,
        totalCollected: parseNum(totalCollected) ?? 0,
        paymentMethod,
        platformCommissionRatePercent,
        followUpRequired: effectiveFollowUp,
        nextFollowUpAt:
          effectiveFollowUp && nextFollowUpAt
            ? new Date(nextFollowUpAt).toISOString()
            : null,
        publicShowcaseEligible,
        showcaseTitle: showcaseTitle.trim() || undefined,
        showcaseSummary: showcaseSummary.trim() || undefined,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "সমাপ্তি ব্যর্থ");
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ত্রুটি");
    } finally {
      setBusy(null);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-q-primary focus:ring-2 focus:ring-q-primary/20";

  if (!isMine && !terminal) {
    return null;
  }

  if (hasBilling && initialBilling) {
    return (
      <div className="space-y-4">
        <AppCard variant="default" className="space-y-3 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-zinc-900">চিকিৎসা ও বিলিং সারাংশ</h3>
          <p className="text-xs text-zinc-500">
            ইনভয়েস নং <span className="font-mono font-semibold">{initialBilling.invoiceNo}</span>
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500">সমাপ্তির ধরন</dt>
              <dd className="font-medium">{TREATMENT_LABELS[initialBilling.status]}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">মোট বিল (গ্রস)</dt>
              <dd className="tabular-nums font-medium">{formatTk(initialBilling.grossAmount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">কমিশনযোগ্য</dt>
              <dd className="tabular-nums">{formatTk(initialBilling.commissionableAmount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">প্ল্যাটফর্ম কমিশন</dt>
              <dd className="tabular-nums">{formatTk(initialBilling.platformCommissionAmount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">বাকি</dt>
              <dd className="tabular-nums">{formatTk(initialBilling.dueAmount)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">প্ল্যাটফর্মে পরিশোধযোগ্য</dt>
              <dd className="tabular-nums font-semibold text-amber-900">
                {formatTk(initialBilling.doctorPayableToPlatform)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">সেটেলমেন্ট অবস্থা</dt>
              <dd>{SETTLEMENT_LABELS[initialBilling.settlementStatus]}</dd>
            </div>
          </dl>
        </AppCard>
      </div>
    );
  }

  if (legacyCompleted) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        এই কেস আগে সমাপ্ত করা হয়েছে; নতুন বিলিং ফর্ম প্রযোজ্য নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।
      </p>
    );
  }

  if (!canDraft && !canSubmit && !terminal) {
    return null;
  }

  return (
    <div className="space-y-5">
      <AppCard variant="default" className="space-y-4 p-4 sm:p-5">
        <h3 className="text-base font-bold text-zinc-900">চিকিৎসা সমাপ্তি ও বিলিং</h3>
        <p className="text-xs leading-relaxed text-zinc-600">
          চিকিৎসা শুরুর পর (চলমান/পর্যবেক্ষণ) এই ফর্ম দিয়ে সমাপ্তি ও বিল জমা দিন। খসড়া সংরক্ষণে
          কিছু ক্লিনিকাল তথ্য রাখা যাবে।
        </p>

        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-q-muted">
            চিকিৎসার তথ্য
          </h4>
          <label className="block text-xs font-medium text-zinc-600">
            সমাপ্তির অবস্থা
            <select
              value={treatmentCompletionStatus}
              onChange={(e) => {
                const v = e.target.value as TreatmentCompletionStatus;
                setTreatmentCompletionStatus(v);
                if (v === TreatmentCompletionStatus.FOLLOW_UP_NEEDED) {
                  setFollowUpRequired(true);
                }
              }}
              disabled={!canDraft && !canSubmit}
              className={`${inputCls} disabled:opacity-60`}
            >
              {(Object.keys(TREATMENT_LABELS) as TreatmentCompletionStatus[]).map((k) => (
                <option key={k} value={k}>
                  {TREATMENT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            পর্যবেক্ষণ
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={2}
              disabled={!canDraft && !canSubmit}
              className={`${inputCls} disabled:opacity-60`}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            নির্ণয় (diagnosis) *
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              disabled={!canDraft && !canSubmit}
              className={`${inputCls} disabled:opacity-60`}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            চিকিৎসা বিবরণ *
            <textarea
              value={treatmentNote}
              onChange={(e) => setTreatmentNote(e.target.value)}
              rows={3}
              disabled={!canDraft && !canSubmit}
              className={`${inputCls} disabled:opacity-60`}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            ব্যবহৃত ঔষধ
            <textarea
              value={medicinesUsed}
              onChange={(e) => setMedicinesUsed(e.target.value)}
              rows={2}
              disabled={!canDraft && !canSubmit}
              className={`${inputCls} disabled:opacity-60`}
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            ডাক্তারের নোট
            <textarea
              value={doctorNote}
              onChange={(e) => setDoctorNote(e.target.value)}
              rows={2}
              disabled={!canDraft && !canSubmit}
              className={`${inputCls} disabled:opacity-60`}
            />
          </label>
        </section>

        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-q-muted">
            বিলিং তথ্য (টাকা — পূর্ণসংখ্যা)
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              সার্ভিস/ভিজিট ফি
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={serviceFee}
                onChange={(e) => setServiceFee(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              ঔষধ চার্জ
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={medicineCharge}
                onChange={(e) => setMedicineCharge(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              পরিবহন চার্জ
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={transportCharge}
                onChange={(e) => setTransportCharge(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              জরুরি চার্জ
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={emergencyCharge}
                onChange={(e) => setEmergencyCharge(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              অন্যান্য চার্জ
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={otherCharge}
                onChange={(e) => setOtherCharge(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              ছাড়
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              মোট গৃহীত
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={totalCollected}
                onChange={(e) => setTotalCollected(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              পেমেন্ট পদ্ধতি
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} disabled:opacity-60`}
              >
                {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-zinc-500">
            প্ল্যাটফর্ম কমিশন হার (প্রিভিউ):{" "}
            <strong>{platformCommissionRatePercent}%</strong> — অ্যাডমিন সেটিংস থেকে।
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900">
            কমিশন হিসাব (প্রিভিউ)
          </h4>
          {preview ? (
            <ul className="space-y-1.5 text-sm text-emerald-950">
              <li className="flex justify-between gap-2">
                <span>মোট বিল (গ্রস)</span>
                <span className="tabular-nums font-semibold">{formatTk(preview.grossAmount)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>কমিশনযোগ্য</span>
                <span className="tabular-nums">{formatTk(preview.commissionableAmount)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>প্ল্যাটফর্ম কমিশন</span>
                <span className="tabular-nums">{formatTk(preview.platformCommissionAmount)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>গ্রাহকের বাকি</span>
                <span className="tabular-nums">{formatTk(preview.dueAmount)}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>প্ল্যাটফর্মে পরিশোধযোগ্য</span>
                <span className="tabular-nums font-semibold text-amber-900">
                  {formatTk(preview.doctorPayableToPlatform)}
                </span>
              </li>
              <li className="border-t border-emerald-200 pt-2 text-xs leading-snug text-emerald-900">
                সেটেলমেন্ট (প্রিভিউ):{" "}
                {settlementPreviewLabelBn({
                  doctorPayableToPlatform: preview.doctorPayableToPlatform,
                  paymentMethod,
                })}
              </li>
            </ul>
          ) : (
            <p className="text-xs text-emerald-800">সংখ্যা পূরণ করলে হিসাব দেখাবে।</p>
          )}
        </section>

        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-q-muted">ফলোআপ</h4>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={followUpRequired}
              onChange={(e) => setFollowUpRequired(e.target.checked)}
              disabled={!canDraft && !canSubmit}
            />
            ফলো-আপ লাগবে
          </label>
          {followUpRequired ? (
            <label className="block text-xs font-medium text-zinc-600">
              পরবর্তী ফলো-আপ
              <input
                type="datetime-local"
                value={nextFollowUpAt}
                onChange={(e) => setNextFollowUpAt(e.target.value)}
                disabled={!canDraft && !canSubmit}
                className={`${inputCls} max-w-xs disabled:opacity-60`}
              />
            </label>
          ) : null}
        </section>

        <section className="space-y-3 border-t border-zinc-100 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wide text-q-muted">
            পাবলিক শোকেস (ঐচ্ছিক)
          </h4>
          <label className="flex items-start gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={publicShowcaseEligible}
              onChange={(e) => setPublicShowcaseEligible(e.target.checked)}
              disabled={!canDraft && !canSubmit}
            />
            <span>পাবলিক শোকেসের জন্য উপযুক্ত</span>
          </label>
          {publicShowcaseEligible ? (
            <>
              <label className="block text-xs font-medium text-zinc-600">
                শোকেস শিরোনাম
                <input
                  value={showcaseTitle}
                  onChange={(e) => setShowcaseTitle(e.target.value)}
                  disabled={!canDraft && !canSubmit}
                  className={`${inputCls} disabled:opacity-60`}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                শোকেস সারাংশ (PII ছাড়া)
                <textarea
                  value={showcaseSummary}
                  onChange={(e) => setShowcaseSummary(e.target.value)}
                  rows={3}
                  disabled={!canDraft && !canSubmit}
                  className={`${inputCls} disabled:opacity-60`}
                />
              </label>
            </>
          ) : null}
        </section>

        <section className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:flex-wrap">
          {canDraft ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void run("draft", saveDraft)}
              className="min-h-[var(--q-touch-min)] touch-manipulation rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
            >
              {busy === "draft" ? "সংরক্ষণ…" : "খসড়া সংরক্ষণ"}
            </button>
          ) : null}
          {canSubmit ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void run("complete", submitComplete)}
              className="min-h-[var(--q-touch-min)] touch-manipulation rounded-2xl bg-q-primary px-5 py-3 text-sm font-bold text-white shadow-sm hover:brightness-95 disabled:opacity-50"
            >
              {busy === "complete" ? "…" : "চিকিৎসা সমাপ্তি ও বিল জমা দিন"}
            </button>
          ) : null}
        </section>

        {err ? (
          <p className="text-sm text-red-600" role="alert">
            {err}
          </p>
        ) : null}
      </AppCard>
    </div>
  );
}
