"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Props = {
  leadId: number;
};

const DEFAULT_AUTHOR = "অ্যাডমিন";

export function LeadNoteForm({ leadId }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setMessage({ kind: "err", text: "নোট লিখুন।" });
      return;
    }

    setMessage(null);
    setLoading(true);
    try {
      const author = createdBy.trim() || DEFAULT_AUTHOR;
      const res = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed, createdBy: author }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "সংরক্ষণ ব্যর্থ।" });
        return;
      }

      setNote("");
      setMessage({ kind: "ok", text: "নোট যোগ হয়েছে।" });
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="lead-note"
          className="block text-sm font-medium text-zinc-700"
        >
          নতুন নোট
        </label>
        <textarea
          id="lead-note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          disabled={loading}
          placeholder="ফলো-আপ বা মন্তব্য লিখুন…"
          className="mt-1 min-h-[120px] w-full rounded-2xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 disabled:opacity-60"
        />
      </div>
      <div>
        <label
          htmlFor="note-created-by"
          className="block text-sm font-medium text-zinc-700"
        >
          কে লিখেছেন <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
        </label>
        <input
          id="note-created-by"
          name="createdBy"
          type="text"
          value={createdBy}
          onChange={(e) => setCreatedBy(e.target.value)}
          disabled={loading}
          placeholder={DEFAULT_AUTHOR}
          className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 disabled:opacity-60 sm:max-w-xs"
        />
        <p className="mt-1 text-xs text-zinc-500">
          খালি রাখলে &quot;{DEFAULT_AUTHOR}&quot; হিসেবে সংরক্ষিত হবে।
        </p>
      </div>
      <button
        type="submit"
        disabled={loading || !note.trim()}
        className="min-h-[44px] w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto touch-manipulation"
      >
        {loading ? "সংরক্ষণ…" : "নোট যোগ করুন"}
      </button>
      {message && (
        <p
          role={message.kind === "err" ? "alert" : "status"}
          className={
            message.kind === "ok"
              ? "text-sm font-medium text-emerald-800"
              : "text-sm text-red-700"
          }
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
