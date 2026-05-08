"use client";

import { useState } from "react";

type Props = {
  smsEnabled: boolean;
  dryRun: boolean;
};

export function AdminSmsStatusPanel({ smsEnabled, dryRun }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function checkBalance() {
    setLoading(true);
    setResult(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/sms/balance", { method: "GET" });
      const data = (await res.json()) as { error?: string; balance?: { rawPreview?: string; httpStatus?: number } };
      if (!res.ok) {
        setErr(data.error ?? "ত্রুটি");
        return;
      }
      setResult(
        `HTTP ${data.balance?.httpStatus ?? "—"} — ${data.balance?.rawPreview ?? "—"}`,
      );
    } catch {
      setErr("নেটওয়ার্ক ত্রুটি");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-zinc-900">SMS (BulkSMSBD)</h2>
      <p className="mt-1 text-sm text-zinc-600">
        SMS API key server-side <code className="rounded bg-zinc-100 px-1">.env</code> থেকে
        নিয়ন্ত্রিত হয়।
      </p>
      <ul className="mt-3 list-inside list-disc text-sm text-zinc-800">
        <li>
          <span className="text-zinc-500">SMS_ENABLED:</span>{" "}
          {smsEnabled ? "true" : "false"}
        </li>
        <li>
          <span className="text-zinc-500">SMS_DRY_RUN:</span>{" "}
          {dryRun ? "true" : "false"}
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void checkBalance()}
          disabled={loading}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "লোড হচ্ছে…" : "ব্যালেন্স চেক"}
        </button>
      </div>
      {result ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-mono text-emerald-950 ring-1 ring-emerald-200">
          {result}
        </p>
      ) : null}
      {err ? (
        <p className="mt-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}
