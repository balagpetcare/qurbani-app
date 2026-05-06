"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { SearchableAreaMultiSelect } from "@/components/forms/SearchableAreaMultiSelect";
import { DOCTOR_AVAILABILITY_OPTIONS } from "@/lib/admin-form-labels";

type AreaOpt = { id: number; name: string; nameBn: string | null };

export function DoctorForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [areaIds, setAreaIds] = useState<number[]>([]);

  useEffect(() => {
    void fetch("/api/areas")
      .then((r) => r.json() as Promise<{ areas?: AreaOpt[] }>)
      .then((d) => {
        if (d.areas) setAreas(d.areas);
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const feeMinRaw = String(fd.get("homeVisitFeeMin") ?? "").trim();
    const feeMaxRaw = String(fd.get("homeVisitFeeMax") ?? "").trim();
    const feeMinNum =
      feeMinRaw && !Number.isNaN(parseInt(feeMinRaw, 10))
        ? parseInt(feeMinRaw, 10)
        : undefined;
    const feeMaxNum =
      feeMaxRaw && !Number.isNaN(parseInt(feeMaxRaw, 10))
        ? parseInt(feeMaxRaw, 10)
        : undefined;

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      whatsapp: String(fd.get("whatsapp") ?? "").trim() || undefined,
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      areaIds,
      qualification: String(fd.get("qualification") ?? "").trim() || undefined,
      experienceSummary: String(fd.get("experienceSummary") ?? "").trim() || undefined,
      shortBio: String(fd.get("shortBio") ?? "").trim() || undefined,
      profilePhotoUrl: String(fd.get("profilePhotoUrl") ?? "").trim() || undefined,
      availableTimeText: String(fd.get("availableTimeText") ?? "").trim() || undefined,
      availabilityStatus: String(fd.get("availabilityStatus") ?? "").trim() || undefined,
      ...(feeMinNum !== undefined ? { homeVisitFeeMin: feeMinNum } : {}),
      ...(feeMaxNum !== undefined ? { homeVisitFeeMax: feeMaxNum } : {}),
      feeNote: String(fd.get("feeNote") ?? "").trim() || undefined,
      notes: String(fd.get("notes") ?? "").trim() || undefined,
      emergencyAvailable: fd.get("emergencyAvailable") === "on",
      isActive: fd.get("isActive") === "on",
    };

    if (areaIds.length === 0) {
      setMessage({ kind: "err", text: "কমপক্ষে একটি এলাকা বেছে নিন।" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "সংরক্ষণ ব্যর্থ।" });
        return;
      }

      setMessage({ kind: "ok", text: "ডাক্তার যোগ করা হয়েছে।" });
      form.reset();
      setAreaIds([]);
      const activeCb = form.elements.namedItem("isActive") as HTMLInputElement | null;
      const emergCb = form.elements.namedItem(
        "emergencyAvailable",
      ) as HTMLInputElement | null;
      if (activeCb) activeCb.checked = true;
      if (emergCb) emergCb.checked = false;
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">নতুন ডাক্তার</h2>
      <p className="mt-1 text-sm text-zinc-500">
        নাম, ফোন, ইমেইল, পাসওয়ার্ড ও কমপক্ষে একটি এলাকা আবশ্যক। লগইনের জন্য ইমেইল ও
        পাসওয়ার্ড ব্যবহার হবে।
      </p>

      {message && (
        <div
          role={message.kind === "err" ? "alert" : "status"}
          className={
            message.kind === "ok"
              ? "mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200"
              : "mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 ring-1 ring-red-200"
          }
        >
          {message.text}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="doc-name" className="block text-sm font-medium text-zinc-700">
              নাম <span className="text-red-600">*</span>
            </label>
            <input
              id="doc-name"
              name="name"
              required
              autoComplete="name"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="doc-phone" className="block text-sm font-medium text-zinc-700">
              ফোন <span className="text-red-600">*</span>
            </label>
            <input
              id="doc-phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="doc-wa" className="block text-sm font-medium text-zinc-700">
              ওয়াটসঅ্যাপ নম্বর
            </label>
            <input
              id="doc-wa"
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-email" className="block text-sm font-medium text-zinc-700">
              ইমেইল <span className="text-red-600">*</span>
            </label>
            <input
              id="doc-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-pass" className="block text-sm font-medium text-zinc-700">
              পাসওয়ার্ড <span className="text-red-600">*</span>
            </label>
            <input
              id="doc-pass"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
            <p className="mt-1 text-xs text-zinc-500">কমপক্ষে ৮ অক্ষর।</p>
          </div>
          <div className="sm:col-span-2">
            <SearchableAreaMultiSelect
              areas={areas}
              label="সেবার এলাকা"
              required
              disabled={areas.length === 0}
              value={areaIds}
              onChange={setAreaIds}
            />
          </div>
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                name="emergencyAvailable"
                type="checkbox"
                className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              জরুরি সেবা উপলব্ধ
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked
                className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              সক্রিয়
            </label>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-qual" className="block text-sm font-medium text-zinc-700">
              যোগ্যতা
            </label>
            <input
              id="doc-qual"
              name="qualification"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-exp" className="block text-sm font-medium text-zinc-700">
              অভিজ্ঞতা সারাংশ
            </label>
            <textarea
              id="doc-exp"
              name="experienceSummary"
              rows={2}
              className="mt-1 w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-bio" className="block text-sm font-medium text-zinc-700">
              সংক্ষিপ্ত বায়ো
            </label>
            <textarea
              id="doc-bio"
              name="shortBio"
              rows={3}
              className="mt-1 w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-photo" className="block text-sm font-medium text-zinc-700">
              প্রোফাইল ছবি URL
            </label>
            <input
              id="doc-photo"
              name="profilePhotoUrl"
              type="url"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-time" className="block text-sm font-medium text-zinc-700">
              উপলব্ধ সময় (টেক্সট)
            </label>
            <input
              id="doc-time"
              name="availableTimeText"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-avail" className="block text-sm font-medium text-zinc-700">
              উপলব্ধতা স্ট্যাটাস
            </label>
            <select
              id="doc-avail"
              name="availabilityStatus"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
              defaultValue=""
            >
              <option value="">নির্বাচন করুন</option>
              {DOCTOR_AVAILABILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="doc-fee-min" className="block text-sm font-medium text-zinc-700">
              হোম ভিজিট ফি — সর্বনিম্ন (৳)
            </label>
            <input
              id="doc-fee-min"
              name="homeVisitFeeMin"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
              placeholder="যেমন ১৫০০"
            />
          </div>
          <div>
            <label htmlFor="doc-fee-max" className="block text-sm font-medium text-zinc-700">
              হোম ভিজিট ফি — সর্বোচ্চ (৳)
            </label>
            <input
              id="doc-fee-max"
              name="homeVisitFeeMax"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
              placeholder="যেমন ৩৫০০"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-fee-note" className="block text-sm font-medium text-zinc-700">
              ফি সম্পর্কিত নোট (পাবলিক)
            </label>
            <textarea
              id="doc-fee-note"
              name="feeNote"
              rows={2}
              maxLength={500}
              className="mt-1 w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
              placeholder="যেমন: রাতে অতিরিক্ত চার্জ প্রযোজ্য হতে পারে"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="doc-notes" className="block text-sm font-medium text-zinc-700">
              অভ্যন্তরীণ নোট (পাবলিক পেজে দেখাবে না)
            </label>
            <textarea
              id="doc-notes"
              name="notes"
              rows={3}
              className="mt-1 min-h-[120px] w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full touch-manipulation rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
        >
          {loading ? "সংরক্ষণ…" : "ডাক্তার যোগ করুন"}
        </button>
      </form>
    </section>
  );
}
