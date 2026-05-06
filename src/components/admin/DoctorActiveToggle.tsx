"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  doctorId: number;
  isActive: boolean;
};

export function DoctorActiveToggle({ doctorId, isActive }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deactivate() {
    if (
      !confirm(
        "এই ডাক্তারকে নিষ্ক্রিয় করবেন? লগইন নিষ্ক্রিয় হবে (ডাটা মুছবে না)।",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "ব্যর্থ।");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "ব্যর্থ।");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (isActive) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void deactivate()}
        className="min-h-[44px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50 touch-manipulation"
      >
        {loading ? "…" : "নিষ্ক্রিয়"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void activate()}
      className="min-h-[44px] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 touch-manipulation"
    >
      {loading ? "…" : "সক্রিয় করুন"}
    </button>
  );
}
