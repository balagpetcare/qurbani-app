import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "অফলাইন · Quarbani 2026",
  description: "ইন্টারনেট সংযোগ নেই। পরে আবার চেষ্টা করুন।",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-emerald-50/90 px-6 py-16 text-center text-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">
        Quarbani 2026
      </p>
      <h1 className="mt-3 max-w-md text-balance text-2xl font-bold text-zinc-900">
        আপনি এখন অফলাইন
      </h1>
      <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-zinc-600">
        ইন্টারনেট ফিরলে হোম পেজ খুলে আবার ডাক্তার অনুরোধ বা লগইন করতে পারবেন। সেবা নিশ্চিত
        করতে জরুরি হলে সরাসরি কল বা WhatsApp করুন।
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-[48px] min-w-[12rem] items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 touch-manipulation"
      >
        হোমে ফিরুন
      </Link>
    </div>
  );
}
