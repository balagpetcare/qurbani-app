"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { bangladeshTelHref, formatPhoneForDisplay } from "@/lib/phone";

type PreviewState =
  | { loading: true }
  | { loading: false; error: string }
  | {
      loading: false;
      error: null;
      payload: PublicPreview;
    };

type PublicPreview =
  | {
      state: "open";
      leadId: number;
      summary: Summary;
    }
  | {
      state: "taken";
      leadId: number;
      message: string;
      assignedDoctorName: string | null;
      summary: Summary;
    }
  | {
      state: "closed";
      leadId: number;
      status: string;
      summary: Summary;
    };

type Summary = {
  customerName: string;
  areaLabel: string;
  animalLabel: string;
  maskedPhone: string;
  problemText: string;
};

export function AcceptLeadClient({ token }: { token: string }) {
  const [preview, setPreview] = useState<PreviewState>({ loading: true });
  const [doctorAuthed, setDoctorAuthed] = useState<boolean | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptedPhone, setAcceptedPhone] = useState<string | null>(null);
  const [doctorLeadUrl, setDoctorLeadUrl] = useState<string | null>(null);

  const returnPath = `/accept-lead/${encodeURIComponent(token)}`;
  const loginHref = `/doctor/login?from=${encodeURIComponent(returnPath)}`;

  const loadPreview = useCallback(async () => {
    setPreview({ loading: true });
    try {
      const res = await fetch(
        `/api/public/lead-acceptance/${encodeURIComponent(token)}`,
        { method: "GET" },
      );
      if (!res.ok) {
        setPreview({
          loading: false,
          error: "লিড পাওয়া যায়নি বা লিংক মেয়াদোত্তীর্ণ।",
        });
        return;
      }
      const json = (await res.json()) as PublicPreview;
      setPreview({ loading: false, error: null, payload: json });
    } catch {
      setPreview({
        loading: false,
        error: "নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।",
      });
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/doctor/me", { credentials: "include" });
        if (!cancelled) setDoctorAuthed(res.ok);
      } catch {
        if (!cancelled) setDoctorAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onAccept() {
    setAcceptError(null);
    setAccepting(true);
    try {
      const res = await fetch(
        `/api/doctor/lead-acceptance/${encodeURIComponent(token)}/accept`,
        { method: "POST", credentials: "include" },
      );
      const data = (await res.json()) as {
        error?: string;
        fullPhone?: string;
        doctorLeadUrl?: string;
      };
      if (res.status === 401) {
        setAcceptError("ডাক্তার হিসেবে লগইন করুন।");
        setDoctorAuthed(false);
        return;
      }
      if (!res.ok) {
        setAcceptError(data.error ?? "গ্রহণ করা যায়নি।");
        return;
      }
      if (data.fullPhone) setAcceptedPhone(data.fullPhone);
      if (data.doctorLeadUrl) setDoctorLeadUrl(data.doctorLeadUrl);
      await loadPreview();
    } catch {
      setAcceptError("নেটওয়ার্ক ত্রুটি।");
    } finally {
      setAccepting(false);
    }
  }

  if (preview.loading) {
    return (
      <p className="text-center text-sm text-zinc-600">লোড হচ্ছে…</p>
    );
  }

  if ("error" in preview && preview.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        {preview.error}
      </div>
    );
  }

  if (!("payload" in preview) || !preview.payload) {
    return null;
  }

  const p = preview.payload;
  const s = p.summary;

  if (acceptedPhone) {
    const tel = bangladeshTelHref(acceptedPhone);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-semibold">লিড গ্রহণ সম্পন্ন</p>
          <p className="mt-2">
            গ্রাহকের নম্বর:{" "}
            <span className="font-mono font-medium">
              {formatPhoneForDisplay(acceptedPhone)}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={tel}
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            কল করুন
          </a>
          {doctorLeadUrl ? (
            <Link
              href={doctorLeadUrl}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              লিড বিবরণে যান
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (p.state === "taken") {
    return (
      <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
        <p className="font-semibold">{p.message}</p>
        {p.assignedDoctorName ? (
          <p className="text-amber-900/90">
            গ্রহণকারী: <span className="font-medium">{p.assignedDoctorName}</span>
          </p>
        ) : null}
      </div>
    );
  }

  if (p.state === "closed") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
        এই লিডটি আর গ্রহণযোগ্য নয় (স্ট্যাটাস: {p.status})।
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          লিড সারাংশ
        </p>
        <dl className="mt-3 grid gap-2 text-sm text-zinc-800">
          <div>
            <dt className="text-xs text-zinc-500">লিড নম্বর</dt>
            <dd className="font-medium">#{p.leadId}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">গ্রাহক</dt>
            <dd>{s.customerName}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">এলাকা</dt>
            <dd>{s.areaLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">পশু</dt>
            <dd>{s.animalLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">ফোন (মাস্ক)</dt>
            <dd className="font-mono">{s.maskedPhone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-zinc-500">সমস্যা</dt>
            <dd className="mt-1 whitespace-pre-wrap">{s.problemText}</dd>
          </div>
        </dl>
      </div>

      {doctorAuthed === false ? (
        <p className="text-sm text-zinc-600">
          গ্রহণ করতে{" "}
          <Link href={loginHref} className="font-semibold text-emerald-800 underline">
            ডাক্তার হিসেবে লগইন
          </Link>{" "}
          করুন।
        </p>
      ) : null}

      {acceptError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {acceptError}
        </div>
      ) : null}

      {doctorAuthed ? (
        <button
          type="button"
          onClick={() => void onAccept()}
          disabled={accepting}
          className="min-h-[48px] w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {accepting ? "গ্রহণ করা হচ্ছে…" : "লিড গ্রহণ করুন"}
        </button>
      ) : doctorAuthed === null ? (
        <p className="text-center text-xs text-zinc-500">সেশন যাচাই…</p>
      ) : null}
    </div>
  );
}
