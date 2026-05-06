"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AppCard } from "@/components/ui/AppCard";
import {
  DoctorTreatmentBillingForm,
  type DoctorBillingSnapshot,
} from "@/components/doctor/DoctorTreatmentBillingForm";
import { LeadStatus } from "@/generated/prisma/enums";
import { doctorQuickStatusTargets } from "@/lib/lead-workflow";

type CaseSnapshot = {
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

type Props = {
  leadId: number;
  doctorId: number;
  leadStatus: LeadStatus;
  assignedDoctorId: number | null;
  initialCase: CaseSnapshot | null;
  initialBilling: DoctorBillingSnapshot | null;
  platformCommissionRatePercent: number;
};

export function DoctorLeadWorkflowPanel({
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
  const terminal =
    leadStatus === LeadStatus.COMPLETED ||
    leadStatus === LeadStatus.FOLLOW_UP_NEEDED ||
    leadStatus === LeadStatus.CANCELLED ||
    leadStatus === LeadStatus.REFERRED;

  const canAcceptPool =
    assignedDoctorId == null && leadStatus === LeadStatus.NEW && !terminal;
  const canAcceptAssigned =
    isMine && leadStatus === LeadStatus.ASSIGNED && !terminal;
  const canStart =
    isMine &&
    (leadStatus === LeadStatus.ACCEPTED || leadStatus === LeadStatus.ASSIGNED) &&
    !terminal;

  const secondaryTargets = useMemo(
    () => doctorQuickStatusTargets(leadStatus),
    [leadStatus],
  );

  async function postJson(url: string, body?: Record<string, unknown>) {
    setErr(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Request failed");
  }

  async function patchJson(url: string, body: Record<string, unknown>) {
    setErr(null);
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Request failed");
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

  async function patchStatus(next: LeadStatus) {
    await patchJson(`/api/doctor/leads/${leadId}/status`, { status: next });
  }

  const btnPrimary =
    "min-h-[var(--q-touch-min)] touch-manipulation rounded-2xl bg-q-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:opacity-50";
  const btnOutline =
    "min-h-[var(--q-touch-min)] touch-manipulation rounded-2xl border-2 border-q-primary bg-q-primary-soft px-5 py-3 text-sm font-bold text-q-primary-deep transition hover:bg-emerald-100 disabled:opacity-50";
  const btnGhost =
    "min-h-[var(--q-touch-min)] touch-manipulation rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 hover:border-q-primary/40 disabled:opacity-50";

  return (
    <div className="space-y-5">
      <AppCard variant="flat" className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-q-muted">
          ধাপ ১ · কেস গ্রহণ ও শুরু
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {canAcceptPool || canAcceptAssigned ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("accept", () =>
                  postJson(`/api/doctor/leads/${leadId}/accept`),
                )
              }
              className={btnPrimary}
            >
              {busy === "accept" ? "…" : "এই কেসটি আমি নিচ্ছি"}
            </button>
          ) : null}

          {canStart ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("start", () =>
                  postJson(`/api/doctor/leads/${leadId}/start-treatment`),
                )
              }
              className={btnOutline}
            >
              {busy === "start" ? "…" : "চিকিৎসা শুরু করুন"}
            </button>
          ) : null}
        </div>
      </AppCard>

      {secondaryTargets.length > 0 && isMine && !terminal ? (
        <AppCard variant="flat" className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-q-muted">
            অতিরিক্ত স্ট্যাটাস
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {secondaryTargets.map((st) => (
              <button
                key={st}
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  if (st === LeadStatus.CANCELLED || st === LeadStatus.REFERRED) {
                    const ok = window.confirm(
                      st === LeadStatus.CANCELLED
                        ? "কেস বাতিল চিহ্নিত করবেন?"
                        : "রেফার করা হবে — নিশ্চিত?",
                    );
                    if (!ok) return;
                  }
                  void run(`st-${st}`, () => patchStatus(st));
                }}
                className={btnGhost}
              >
                {st === LeadStatus.OBSERVED
                  ? "পর্যবেক্ষণ"
                  : st === LeadStatus.IN_PROGRESS
                    ? "চলমান"
                    : st === LeadStatus.CANCELLED
                      ? "বাতিল"
                      : st === LeadStatus.REFERRED
                        ? "রেফার"
                        : st}
              </button>
            ))}
          </div>
        </AppCard>
      ) : null}

      <DoctorTreatmentBillingForm
        leadId={leadId}
        doctorId={doctorId}
        leadStatus={leadStatus}
        assignedDoctorId={assignedDoctorId}
        initialCase={initialCase}
        initialBilling={initialBilling}
        platformCommissionRatePercent={platformCommissionRatePercent}
      />

      {err ? (
        <p className="text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
