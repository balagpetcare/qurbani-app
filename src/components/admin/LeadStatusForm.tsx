"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { leadStatusLabel } from "@/components/admin/LeadStatusBadge";
import { LeadStatus } from "@/generated/prisma/browser";

type StatusValue = (typeof LeadStatus)[keyof typeof LeadStatus];

const ORDERED_STATUSES: StatusValue[] = [
  LeadStatus.NEW,
  LeadStatus.ASSIGNED,
  LeadStatus.ACCEPTED,
  LeadStatus.IN_PROGRESS,
  LeadStatus.OBSERVED,
  LeadStatus.COMPLETED,
  LeadStatus.FOLLOW_UP_NEEDED,
  LeadStatus.CANCELLED,
  LeadStatus.REFERRED,
];

type Props = {
  leadId: number;
  currentStatus: StatusValue;
};

export function LeadStatusForm({ leadId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusValue>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "আপডেট ব্যর্থ।" });
        return;
      }

      setMessage({ kind: "ok", text: "স্ট্যাটাস আপডেট হয়েছে।" });
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="lead-status"
            className="block text-sm font-medium text-zinc-700"
          >
            স্ট্যাটাস
          </label>
          <select
            id="lead-status"
            name="status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as StatusValue)
            }
            disabled={loading}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 disabled:opacity-60"
          >
            {ORDERED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || status === currentStatus}
          className="min-h-[44px] w-full rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto touch-manipulation"
        >
          {loading ? "সংরক্ষণ…" : "স্ট্যাটাস সংরক্ষণ"}
        </button>
      </div>
      {message && (
        <p
          role={message.kind === "err" ? "alert" : "status"}
          className={
            message.kind === "ok"
              ? "text-sm font-medium text-emerald-800"
              : "text-sm text-red-700"
          }
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
