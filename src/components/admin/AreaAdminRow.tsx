"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AdminCard } from "@/components/admin/ui/AdminCard";

type AreaRow = {
  id: number;
  slug: string;
  name: string;
  nameBn: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { doctors: number; leads: number };
};

export function AreaAdminRow({ area }: { area: AreaRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nameBn, setNameBn] = useState(area.nameBn ?? "");
  const [err, setErr] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>) {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/areas/${area.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "সংরক্ষণ ব্যর্থ");
        return;
      }
      router.refresh();
    } catch {
      setErr("নেটওয়ার্ক ত্রুটি");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminCard>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-zinc-900">{area.nameBn ?? area.name}</p>
          <p className="text-xs text-q-muted">
            {area.name} · <span className="font-mono">{area.slug}</span>
          </p>
        </div>
        {area.isActive ? (
          <AppBadge tone="success">সক্রিয়</AppBadge>
        ) : (
          <AppBadge tone="neutral">নিষ্ক্রিয়</AppBadge>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-q-muted">ডাক্তার</dt>
          <dd className="font-semibold tabular-nums">{area._count.doctors}</dd>
        </div>
        <div>
          <dt className="text-q-muted">সক্রিয় লিড</dt>
          <dd className="font-semibold tabular-nums">{area._count.leads}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <label className="block text-xs font-semibold text-zinc-700">নাম (বাংলা)</label>
        <input
          value={nameBn}
          onChange={(e) => setNameBn(e.target.value)}
          className="min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
        />
        <AppButton
          type="button"
          variant="secondary"
          block
          disabled={loading}
          onClick={() => patch({ nameBn: nameBn.trim() || null })}
        >
          বাংলা নাম সংরক্ষণ
        </AppButton>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AppButton
          type="button"
          variant={area.isActive ? "ghost" : "primary"}
          disabled={loading}
          onClick={() => patch({ isActive: !area.isActive })}
        >
          {area.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
        </AppButton>
      </div>

      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
    </AdminCard>
  );
}
