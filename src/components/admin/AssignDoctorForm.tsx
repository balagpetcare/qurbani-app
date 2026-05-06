"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type AssignDoctorOption = {
  id: number;
  name: string;
};

type Props = {
  leadId: number;
  assignedDoctorId: number | null;
  doctors: AssignDoctorOption[];
};

export function AssignDoctorForm({
  leadId,
  assignedDoctorId,
  doctors,
}: Props) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState<string>(
    assignedDoctorId != null ? String(assignedDoctorId) : "",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const payload =
      doctorId === "" ? { doctorId: null as null } : { doctorId: parseInt(doctorId, 10) };

    if (doctorId !== "" && Number.isNaN(payload.doctorId as number)) {
      setMessage({ kind: "err", text: "সঠিক ডাক্তার নির্বাচন করুন।" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/leads/${leadId}/assign-doctor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "আপডেট ব্যর্থ।" });
        return;
      }

      setMessage({ kind: "ok", text: "অ্যাসাইনমেন্ট সংরক্ষিত।" });
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setLoading(false);
    }
  }

  const unchangedSelection =
    (doctorId === "" && assignedDoctorId === null) ||
    (doctorId !== "" && parseInt(doctorId, 10) === assignedDoctorId);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="assign-doctor"
            className="block text-sm font-medium text-zinc-700"
          >
            ডাক্তার নির্বাচন
          </label>
          <select
            id="assign-doctor"
            name="doctorId"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            disabled={loading || doctors.length === 0}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 disabled:opacity-60"
          >
            <option value="">
              {doctors.length === 0
                ? "কোনো সক্রিয় ডাক্তার নেই"
                : "কোনো ডাক্তার নয় / সরান"}
            </option>
            {doctors.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || doctors.length === 0 || unchangedSelection}
          className="min-h-[44px] w-full shrink-0 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto touch-manipulation"
        >
          {loading ? "সংরক্ষণ…" : "সংরক্ষণ করুন"}
        </button>
      </div>
      {doctors.length === 0 && (
        <p className="text-sm text-amber-800">
          সক্রিয় ডাক্তার যোগ করতে{" "}
          <Link href="/admin/doctors" className="font-medium underline">
            ডাক্তার পেজ
          </Link>{" "}
          খুলুন।
        </p>
      )}
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
