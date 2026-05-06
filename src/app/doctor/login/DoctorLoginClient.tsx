"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { DoctorAppHeader } from "@/components/doctor/DoctorAppHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppShell } from "@/components/ui/AppShell";

export function DoctorLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const identifier = String(fd.get("identifier") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    try {
      const res = await fetch("/api/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }

      const fromRaw = searchParams.get("from");
      const from =
        typeof fromRaw === "string" &&
        fromRaw.startsWith("/") &&
        !fromRaw.startsWith("//")
          ? fromRaw
          : "/doctor/leads";
      router.replace(from);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1 min-h-[var(--q-touch-min)] w-full rounded-2xl border border-zinc-200 px-3 py-2.5 text-base outline-none focus:border-q-primary focus:ring-2 focus:ring-q-primary/20";

  return (
    <AppShell
      variant="doctor"
      header={
        <DoctorAppHeader
          title="ডাক্তার লগইন"
          subtitle="কুরবানি ২০২৬ · নিরাপদ প্রবেশ"
          backHref="/"
          backLabel="হোম"
          backPreset="home"
          variant="gradient"
        />
      }
    >
      <div className="mx-auto flex min-h-[min(560px,calc(100dvh-10rem))] w-full min-w-0 max-w-md flex-col justify-center py-8 sm:py-12">
        <AppCard variant="default" className="p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-q-muted">
            অ্যাডমিন কর্তৃক তৈরি ইমেইল বা ফোন ও পাসওয়ার্ড ব্যবহার করুন।
          </p>

          {error ? (
            <div
              className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label
                htmlFor="doc-ident"
                className="block text-sm font-semibold text-zinc-800"
              >
                ইমেইল বা ফোন
              </label>
              <input
                id="doc-ident"
                name="identifier"
                required
                autoComplete="username"
                className={fieldClass}
                placeholder="ইমেইল অথবা ০১১…"
              />
            </div>
            <div>
              <label
                htmlFor="doc-pass"
                className="block text-sm font-semibold text-zinc-800"
              >
                পাসওয়ার্ড
              </label>
              <input
                id="doc-pass"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={fieldClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[var(--q-touch-min)] w-full touch-manipulation rounded-2xl bg-q-primary py-3.5 text-base font-bold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
            >
              {loading ? "লগইন…" : "লগইন"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-q-muted">
            <Link
              href="/doctor/apply"
              className="font-semibold text-q-primary-deep underline-offset-2 hover:underline"
            >
              নতুন ডাক্তার আবেদন
            </Link>
            {" · "}
            <Link href="/" className="font-semibold text-q-primary-deep underline-offset-2 hover:underline">
              হোম
            </Link>
          </p>
        </AppCard>
      </div>
    </AppShell>
  );
}
