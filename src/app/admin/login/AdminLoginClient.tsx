"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AppCard } from "@/components/ui/AppCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppShell } from "@/components/ui/AppShell";

function safeRedirectTarget(from: string | null): string {
  if (
    from &&
    from.startsWith("/admin") &&
    !from.startsWith("/admin/login")
  ) {
    return from;
  }
  return "/admin";
}

export function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "লগইন ব্যর্থ।");
        return;
      }

      router.push(safeRedirectTarget(from));
      router.refresh();
    } catch {
      setError("নেটওয়ার্ক ত্রুটি।");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "mt-1 min-h-[var(--q-touch-min)] w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-q-primary focus:ring-2 focus:ring-q-primary/20 disabled:opacity-60";

  return (
    <AppShell
      variant="admin"
      header={
        <AppHeader
          title="অ্যাডমিন লগইন"
          subtitle="কুরবানি ২০২৬ · নিরাপদ প্রবেশ"
          backHref="/"
          backLabel="সাইট"
          variant="gradient"
        />
      }
    >
      <div className="mx-auto flex min-h-[min(520px,calc(100dvh-10rem))] w-full min-w-0 max-w-md flex-col justify-center py-8 sm:py-12">
        <AppCard variant="default" className="p-6 sm:p-8">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="admin-identifier"
                className="block text-sm font-semibold text-zinc-800"
              >
                ইমেইল বা ফোন
              </label>
              <input
                id="admin-identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-semibold text-zinc-800"
              >
                পাসওয়ার্ড
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className={fieldClass}
              />
            </div>

            {error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 min-h-[var(--q-touch-min)] w-full touch-manipulation rounded-2xl bg-q-primary py-3.5 text-base font-bold text-white shadow-sm hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "লগইন…" : "লগইন"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-q-muted">
            <Link href="/" className="font-semibold text-q-primary-deep underline-offset-2 hover:underline">
              ← হোমে ফিরুন
            </Link>
          </p>
        </AppCard>
      </div>
    </AppShell>
  );
}
