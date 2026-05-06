"use client";

import { FormEvent, useEffect, useState } from "react";

import { SearchableAreaMultiSelect } from "@/components/forms/SearchableAreaMultiSelect";
import {
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
} from "@/lib/phone";

type AreaOpt = { id: number; name: string; nameBn: string | null };

export function DoctorApplicationForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [refId, setRefId] = useState<number | null>(null);
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areaIds, setAreaIds] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/areas")
      .then((r) => r.json() as Promise<{ areas?: AreaOpt[]; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        if (data.error || !data.areas) {
          setAreasError("এলাকার তালিকা লোড করা যায়নি। পেজ রিফ্রেশ করুন।");
          return;
        }
        setAreas(data.areas);
      })
      .catch(() => {
        if (!cancelled) setAreasError("এলাকার তালিকা লোড করা যায়নি।");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      whatsapp: String(fd.get("whatsapp") ?? "").trim() || undefined,
      email: String(fd.get("email") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim() || undefined,
      qualification: String(fd.get("qualification") ?? "").trim() || undefined,
      experience: String(fd.get("experience") ?? "").trim() || undefined,
      note: String(fd.get("note") ?? "").trim() || undefined,
      areaIds,
    };

    if (areaIds.length === 0) {
      setError("কমপক্ষে একটি কাজের এলাকা বেছে নিন।");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/doctor-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        messageBn?: string;
        application?: { id: number };
      };

      if (!res.ok) {
        setError(
          data.messageBn ??
            (data.error === "email is required"
              ? "ইমেইল আবশ্যক।"
              : data.error === "name is required"
                ? "নাম আবশ্যক।"
                : data.error === "phone is required"
                  ? "মোবাইল আবশ্যক।"
                  : data.error === BD_PHONE_INVALID_MSG_BN ||
                      data.error === "Enter a valid Bangladesh mobile number."
                    ? BD_PHONE_INVALID_MSG_BN
                    : data.error === BD_WHATSAPP_INVALID_MSG_BN
                      ? BD_WHATSAPP_INVALID_MSG_BN
                      : data.error === "areaIds must include at least one area"
                        ? "কমপক্ষে একটি এলাকা বেছে নিন।"
                        : data.error ??
                          "জমা দিতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।"),
        );
        return;
      }

      form.reset();
      setAreaIds([]);
      setSuccess(true);
      setRefId(data.application?.id ?? null);
    } catch {
      setError("নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-sm ring-1 ring-emerald-100"
        role="status"
      >
        <p className="text-lg font-semibold text-emerald-950">
          আবেদন জমা দেওয়া হয়েছে
        </p>
        <p className="mt-2 text-sm text-emerald-900/90">
          আমরা শীঘ্রই যোগাযোগ করব। ধন্যবাদ।
        </p>
        {refId != null && (
          <p className="mt-3 text-xs text-emerald-800/80">
            রেফারেন্স নম্বর: #{refId}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/40 sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
        ডাক্তার হিসেবে যোগ দিন
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        কুরবানি ২০২৬ ভেটেরিনারি সাপোর্ট টিমে যোগ দিতে ফর্মটি পূরণ করুন। আমরা যাচাই
        করে ফিরব।
      </p>

      {areasError ? (
        <div
          className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200"
          role="status"
        >
          {areasError}
        </div>
      ) : null}

      {error ? (
        <div
          className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="doc-app-name" className="block text-sm font-medium text-zinc-800">
            পূর্ণ নাম <span className="text-red-600">*</span>
          </label>
          <input
            id="doc-app-name"
            name="name"
            required
            autoComplete="name"
            className="mt-1.5 min-h-[48px] w-full rounded-lg border border-zinc-300 px-3 py-3 text-base text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="doc-app-phone" className="block text-sm font-medium text-zinc-800">
              মোবাইল <span className="text-red-600">*</span>
            </label>
            <input
              id="doc-app-phone"
              name="phone"
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              className="mt-1.5 min-h-[48px] w-full rounded-lg border border-zinc-300 px-3 py-3 text-base text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
              placeholder="০১১xxxxxxxx"
            />
          </div>
          <div>
            <label htmlFor="doc-app-wa" className="block text-sm font-medium text-zinc-800">
              WhatsApp <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
            </label>
            <input
              id="doc-app-wa"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="mt-1.5 min-h-[48px] w-full rounded-lg border border-zinc-300 px-3 py-3 text-base text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
        </div>
        <div>
          <label htmlFor="doc-app-email" className="block text-sm font-medium text-zinc-800">
            ইমেইল <span className="text-red-600">*</span>
          </label>
          <input
            id="doc-app-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 min-h-[48px] w-full rounded-lg border border-zinc-300 px-3 py-3 text-base text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="doc-app-address" className="block text-sm font-medium text-zinc-800">
            ঠিকানা <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
          </label>
          <textarea
            id="doc-app-address"
            name="address"
            rows={2}
            className="mt-1.5 min-h-[96px] w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 text-base leading-relaxed text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="doc-app-qual" className="block text-sm font-medium text-zinc-800">
            যোগ্যতা <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
          </label>
          <input
            id="doc-app-qual"
            name="qualification"
            className="mt-1.5 min-h-[48px] w-full rounded-lg border border-zinc-300 px-3 py-3 text-base text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="doc-app-exp" className="block text-sm font-medium text-zinc-800">
            অভিজ্ঞতা <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
          </label>
          <textarea
            id="doc-app-exp"
            name="experience"
            rows={3}
            className="mt-1.5 min-h-[120px] w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 text-base leading-relaxed text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
          />
        </div>

        <SearchableAreaMultiSelect
          areas={areas}
          label="কাজ করতে ইচ্ছুক এলাকা"
          required
          disabled={areas.length === 0}
          value={areaIds}
          onChange={setAreaIds}
        />

        <div>
          <label htmlFor="doc-app-note" className="block text-sm font-medium text-zinc-800">
            অতিরিক্ত নোট <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
          </label>
          <textarea
            id="doc-app-note"
            name="note"
            rows={3}
            className="mt-1.5 min-h-[120px] w-full resize-y rounded-lg border border-zinc-300 px-3 py-3 text-base leading-relaxed text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading || areas.length === 0}
          className="min-h-[52px] w-full rounded-xl bg-emerald-600 py-3.5 text-lg font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "জমা দেওয়া হচ্ছে…" : "আবেদন জমা দিন"}
        </button>
      </form>
    </div>
  );
}
