"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Props = {
  leadId: number;
};

export function DoctorObservationForm({ leadId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const condition = String(fd.get("condition") ?? "").trim();
    const note = String(fd.get("note") ?? "").trim();
    if (!condition && !note) {
      setError("অবস্থা অথবা নোট লিখুন।");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/leads/${leadId}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition: condition || undefined,
          note: note || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "সংরক্ষণ ব্যর্থ।");
        return;
      }
      e.currentTarget.reset();
      router.refresh();
    } catch {
      setError("নেটওয়ার্ক ত্রুটি।");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-q-primary focus:ring-2 focus:ring-q-primary/20";

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label htmlFor={`obs-c-${leadId}`} className="block text-xs font-semibold text-zinc-700">
          অবস্থা / লক্ষণ (ঐচ্ছিক)
        </label>
        <input id={`obs-c-${leadId}`} name="condition" className={field} />
      </div>
      <div>
        <label htmlFor={`obs-n-${leadId}`} className="block text-xs font-semibold text-zinc-700">
          পর্যবেক্ষণ / চিকিৎসা নোট
        </label>
        <textarea
          id={`obs-n-${leadId}`}
          name="note"
          rows={4}
          className={`${field} resize-y min-h-[120px]`}
          placeholder="ভিজিটের বিবরণ, পরামর্শ, ওষুধ ইত্যাদি"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="min-h-[var(--q-touch-min)] w-full touch-manipulation rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {loading ? "সংরক্ষণ…" : "পর্যবেক্ষণ যোগ করুন"}
      </button>
    </form>
  );
}
