"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { LeadStatus } from "@/generated/prisma/browser";

type Props = {
  leadId: number;
  status: LeadStatus;
  assignedDoctorId: number | null;
  viewerDoctorId: number;
};

export function DoctorLeadQuickStatus({
  leadId,
  status,
  assignedDoctorId,
  viewerDoctorId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMine = assignedDoctorId === viewerDoctorId;
  const terminal =
    status === LeadStatus.COMPLETED ||
    status === LeadStatus.FOLLOW_UP_NEEDED ||
    status === LeadStatus.CANCELLED ||
    status === LeadStatus.REFERRED;

  async function post(url: string) {
    setError(null);
    setLoading(url);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Update failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(null);
    }
  }

  async function patchStatus(next: LeadStatus) {
    setError(null);
    setLoading(`st-${next}`);
    try {
      const res = await fetch(`/api/doctor/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Update failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(null);
    }
  }

  if (terminal) {
    return null;
  }

  const actions: { label: string; onClick: () => void; show: boolean }[] = [
    {
      label: "এই কেসটি আমি নিচ্ছি",
      show:
        (assignedDoctorId == null && status === LeadStatus.NEW) ||
        (isMine && status === LeadStatus.ASSIGNED),
      onClick: () => void post(`/api/doctor/leads/${leadId}/accept`),
    },
    {
      label: "চিকিৎসা শুরু",
      show:
        isMine &&
        (status === LeadStatus.ACCEPTED || status === LeadStatus.ASSIGNED),
      onClick: () => void post(`/api/doctor/leads/${leadId}/start-treatment`),
    },
    {
      label: "পর্যবেক্ষণ",
      show: isMine && status === LeadStatus.IN_PROGRESS,
      onClick: () => void patchStatus(LeadStatus.OBSERVED),
    },
  ];

  const visible = actions.filter((a) => a.show);

  if (visible.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        <LinkToDetail leadId={leadId} />
      </p>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:min-w-[12rem]">
      <div className="flex flex-wrap gap-1">
        {visible.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={loading !== null}
            onClick={() => a.onClick()}
            className="min-h-[var(--q-touch-min)] touch-manipulation rounded-2xl border-2 border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:border-q-primary hover:bg-q-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading !== null ? "…" : a.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-zinc-400">
        <LinkToDetail leadId={leadId} />
      </p>
    </div>
  );
}

function LinkToDetail({ leadId }: { leadId: number }) {
  return (
    <a href={`/doctor/leads/${leadId}`} className="text-emerald-700 hover:underline">
      বিস্তারিত → সম্পূর্ণ ফর্ম
    </a>
  );
}
