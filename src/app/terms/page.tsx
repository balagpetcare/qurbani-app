import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "শর্তাবলী — Quurbani",
  description: "Quurbani পরিষেবার শর্তাবলী",
};

/** Public terms shell — replace with counsel-reviewed terms before store submission. */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-neutral-900">
      <h1 className="text-2xl font-semibold tracking-tight">শর্তাবলী</h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-800">
        এই পৃষ্ঠাটি অ্যাপ ও ওয়েব স্টোরের জন্য পাবলিক শর্তাবলীর স্থানধারী। চূড়ান্ত আইনি পাঠ্য এখানে
        প্রকাশ করুন।
      </p>
      <p className="mt-4 text-base leading-relaxed text-neutral-800">
        <strong>English:</strong> This page holds the canonical terms URL for the Quurbani mobile app (
        <code>/terms</code>). Replace this placeholder with your finalized terms before production release.
      </p>
    </main>
  );
}
