"use client";

import { useCallback, useState } from "react";

type Props = { leadId: number };

export function CopyWhatsAppLeadButton({ leadId }: Props) {
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [hint, setHint] = useState<string | null>(null);

  const onCopy = useCallback(async () => {
    setPhase("loading");
    setHint(null);
    try {
      const res = await fetch(
        `/api/admin/leads/${leadId}/whatsapp-dispatch/copy`,
        { method: "POST", credentials: "include" },
      );
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setPhase("error");
        setHint(data.error ?? "বার্তা তৈরি করা যায়নি।");
        return;
      }
      const text = data.message ?? "";
      if (!text) {
        setPhase("error");
        setHint("খালি বার্তা।");
        return;
      }
      await navigator.clipboard.writeText(text);
      setPhase("done");
      setHint("WhatsApp বার্তাটি ক্লিপবোর্ডে কপি হয়েছে।");
    } catch {
      setPhase("error");
      setHint("কপি ব্যর্থ — ব্রাউজারে ক্লিপবোর্ড অনুমতি দিন।");
    }
  }, [leadId]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onCopy()}
        disabled={phase === "loading"}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 sm:w-auto sm:min-h-[44px] sm:rounded-xl"
      >
        {phase === "loading" ? "তৈরি হচ্ছে…" : "Copy WhatsApp Message"}
      </button>
      {hint ? (
        <p
          className={`text-sm ${
            phase === "error" ? "text-red-700" : "text-emerald-800"
          }`}
          role="status"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
