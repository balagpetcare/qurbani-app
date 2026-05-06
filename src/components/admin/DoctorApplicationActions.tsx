"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SearchableAreaMultiSelect } from "@/components/forms/SearchableAreaMultiSelect";
import { DoctorApplicationStatus } from "@/generated/prisma/enums";

type AreaOpt = { id: number; name: string; nameBn: string | null };

type Props = {
  applicationId: number;
  status: DoctorApplicationStatus;
  areas: AreaOpt[];
  initialAreaIds: number[];
  initialAdminReviewNote: string | null;
  applicantEmail: string | null;
};

export function DoctorApplicationActions({
  applicationId,
  status,
  areas,
  initialAreaIds,
  initialAdminReviewNote,
  applicantEmail,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [areaIds, setAreaIds] = useState<number[]>(initialAreaIds);
  const [adminNote, setAdminNote] = useState(initialAdminReviewNote ?? "");

  async function patchJson(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/doctor-applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "ব্যর্থ।");
      return false;
    }
    router.refresh();
    return true;
  }

  async function patchStatus(next: DoctorApplicationStatus) {
    setLoading(next);
    try {
      await patchJson({ status: next });
    } finally {
      setLoading(null);
    }
  }

  async function saveReview() {
    if (areaIds.length === 0) {
      setError("কমপক্ষে একটি এলাকা রাখুন।");
      return;
    }
    setLoading("save-review");
    try {
      await patchJson({ adminReviewNote: adminNote.trim() || null, areaIds });
    } finally {
      setLoading(null);
    }
  }

  async function convert(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const email = String(fd.get("email") ?? "").trim();
    if (areaIds.length === 0) {
      setError("কনভার্টের আগে কমপক্ষে একটি এলাকা বেছে নিন।");
      return;
    }
    setLoading("convert");
    try {
      const res = await fetch(
        `/api/admin/doctor-applications/${applicationId}/convert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            ...(email ? { email } : {}),
            areaIds,
          }),
        },
      );
      const data = (await res.json()) as { error?: string; doctor?: { id: number } };
      if (!res.ok) {
        setError(data.error ?? "কনভার্ট ব্যর্থ।");
        return;
      }
      if (data.doctor?.id) {
        router.push(`/admin/doctors/${data.doctor.id}/edit`);
      }
    } catch {
      setError("নেটওয়ার্ক ত্রুটি।");
    } finally {
      setLoading(null);
    }
  }

  const closed =
    status === DoctorApplicationStatus.CONVERTED_TO_DOCTOR ||
    status === DoctorApplicationStatus.REJECTED;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {!closed ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void patchStatus(DoctorApplicationStatus.REVIEWED)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {loading === DoctorApplicationStatus.REVIEWED
                ? "…"
                : "রিভিউ চিহ্নিত"}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void patchStatus(DoctorApplicationStatus.APPROVED)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading === DoctorApplicationStatus.APPROVED ? "…" : "অনুমোদন"}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void patchStatus(DoctorApplicationStatus.REJECTED)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
            >
              {loading === DoctorApplicationStatus.REJECTED ? "…" : "প্রত্যাখ্যান"}
            </button>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              অ্যাডমিন পর্যবেক্ষণ ও এলাকা
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              কনভার্ট করার আগে এলাকা যাচাই/সংশোধন করুন। নোট শুধু অভ্যন্তরীণ।
            </p>
            <label className="mt-3 block text-xs font-medium text-zinc-700">
              অ্যাডমিন নোট
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3">
              <SearchableAreaMultiSelect
                areas={areas}
                label="কাজের এলাকা (কনভার্টে ব্যবহৃত হবে)"
                required
                disabled={areas.length === 0}
                value={areaIds}
                onChange={setAreaIds}
              />
            </div>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void saveReview()}
              className="mt-3 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
            >
              {loading === "save-review" ? "সংরক্ষণ…" : "নোট ও এলাকা সংরক্ষণ"}
            </button>
          </div>
        </>
      ) : null}

      {status === DoctorApplicationStatus.APPROVED ? (
        <form
          onSubmit={(e) => void convert(e)}
          className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"
        >
          <p className="text-sm font-semibold text-emerald-950">
            ডাক্তার অ্যাকাউন্ট তৈরি করুন
          </p>
          <p className="mt-1 text-xs text-emerald-900/85">
            শুধু অনুমোদিত আবেদন থেকে। পাসওয়ার্ড দিয়ে লগইন সক্রিয় হবে — আগে স্বয়ংক্রিয়
            অ্যাকাউন্ট তৈরি হয় না। উপরের এলাকা নির্বাচন কনভার্টে ব্যবহৃত হবে।
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="conv-pass" className="block text-xs font-medium text-zinc-700">
                পাসওয়ার্ড <span className="text-red-600">*</span> (মিন. ৮ অক্ষর)
              </label>
              <input
                id="conv-pass"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="conv-email" className="block text-xs font-medium text-zinc-700">
                ইমেইল <span className="font-normal text-zinc-500">(ঐচ্ছিক ওভাররাইড)</span>
              </label>
              <input
                id="conv-email"
                name="email"
                type="email"
                defaultValue={applicantEmail ?? ""}
                autoComplete="email"
                placeholder={applicantEmail ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading !== null}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading === "convert" ? "কনভার্ট…" : "ডাক্তার অ্যাকাউন্ট তৈরি করুন"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
