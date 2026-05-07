"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { tutorialId: number };

export function AdminTutorialModerationControls({ tutorialId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function approve() {
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/moderation/tutorials/${tutorialId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(j.error ?? "অনুমোদন ব্যর্থ।");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/moderation/tutorials/${tutorialId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonBn: rejectReason }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(j.error ?? "প্রত্যাখ্যান ব্যর্থ।");
        return;
      }
      setRejectReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-q-border pt-3">
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-q-primary-deep px-4 py-2 text-sm font-bold text-white touch-manipulation disabled:opacity-50"
          disabled={busy}
          onClick={() => void approve()}
        >
          অনুমোদন
        </button>
      </div>
      <form onSubmit={reject} className="space-y-2">
        <label className="block text-sm font-medium text-q-primary-deep">
          প্রত্যাখ্যানের কারণ
          <textarea
            className="mt-1 w-full min-h-[72px] rounded-xl border border-q-border px-3 py-2 text-sm"
            value={rejectReason}
            onChange={(ev) => setRejectReason(ev.target.value)}
            disabled={busy}
            required
            minLength={3}
          />
        </label>
        <button
          type="submit"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 touch-manipulation disabled:opacity-50"
          disabled={busy}
        >
          প্রত্যাখ্যান
        </button>
      </form>
    </div>
  );
}
