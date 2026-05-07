import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "গোপনীয়তা নীতি — Quurbani",
  description: "Quurbani গোপনীয়তা নীতি",
};

/** Public privacy policy shell — replace body copy with counsel-reviewed text before store submission. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-neutral-900">
      <h1 className="text-2xl font-semibold tracking-tight">গোপনীয়তা নীতি</h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-800">
        এই পৃষ্ঠাটি অ্যাপ ও ওয়েব স্টোরের জন্য পাবলিক গোপনীয়তা নীতির স্থানধারী। চূড়ান্ত আইনি
        ও নীতিমালা দলের অনুমোদিত পূর্ণ পাঠ্য এখানে প্রকাশ করুন।
      </p>
      <p className="mt-4 text-base leading-relaxed text-neutral-800">
        <strong>English:</strong> This page holds the canonical privacy policy URL for the Quurbani mobile app
        (<code>/privacy</code>). Replace this placeholder with your finalized policy before production release.
      </p>
      <p className="text-sm text-neutral-500">
        সাপোর্ট: নীচের স্টোর তালিকায় উল্লিখিত যোগাযোগ ব্যবহার করুন।
      </p>
    </main>
  );
}
