import type { Metadata } from "next";
import Link from "next/link";

import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const SEED_PLACEHOLDER_EMAIL = "support@example.com";

export const metadata: Metadata = {
  title: "Data Deletion Instructions / ডাটা ডিলিট করার নির্দেশনা",
  description:
    "Facebook/Meta লগইন ব্যবহারকারীদের জন্য Quurbani 2026 অ্যাকাউন্ট ও ডাটা মুছে ফেলার নির্দেশনা।",
};

/** Support lines for account/data deletion requests (Meta/Facebook Login disclosure). */
const DELETION_SUPPORT_PHONE_DISPLAY = "01881-227204";
const DELETION_SUPPORT_PHONE_TEL = "tel:+8801881227204";
const DELETION_WHATSAPP_DISPLAY = "+880 1701-022274";
const DELETION_WHATSAPP_WA_ME = "https://wa.me/8801701022274";

function resolvePublicSupportEmail(raw: string): { isConfigured: boolean; value: string } {
  const t = raw.trim();
  if (!t || t.toLowerCase() === SEED_PLACEHOLDER_EMAIL.toLowerCase()) {
    return { isConfigured: false, value: SEED_PLACEHOLDER_EMAIL };
  }
  return { isConfigured: true, value: t };
}

export default async function DataDeletionPage() {
  const lp = await getLandingPublicPayloadSafe();
  const emailInfo = resolvePublicSupportEmail(lp.email);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-neutral-900">
      <h1 className="text-2xl font-semibold tracking-tight">
        Data Deletion Instructions{" "}
        <span className="block text-xl font-medium text-neutral-800 sm:inline sm:before:content-['_/'] sm:before:mx-1">
          ডাটা ডিলিট করার নির্দেশনা
        </span>
      </h1>

      <p className="mt-6 text-base leading-relaxed text-neutral-800">
        আপনি চাইলে আপনার <strong>Quurbani 2026</strong> (কুরবানি ২০২৬) অ্যাকাউন্ট এবং সংশ্লিষ্ট ডাটা মুছে
        ফেলার অনুরোধ করতে পারেন। এটি Facebook বা অন্যান্য লগইন ব্যবহার করলেও প্রযোজ্য।
      </p>

      <p className="mt-4 text-base leading-relaxed text-neutral-800">
        আমাদের কাছে থাকতে পারে এমন তথ্যের মধ্যে আছে: আপনার <strong>নাম</strong>,{" "}
        <strong>মোবাইল নম্বর</strong>, <strong>এলাকা</strong>, <strong>অনুরোধের বিবরণ</strong>, আপলোড
        করা <strong>ছবি বা ভিডিও</strong>, এবং <strong>কীভাবে লগইন করেছেন</strong> (যেমন Facebook বা
        Google) — এরকম তথ্য।
      </p>

      <p className="mt-4 text-base leading-relaxed text-neutral-800">
        ডাটা মুছে ফেলতে <strong>সাপোর্ট টিমে যোগাযোগ করুন</strong> এবং আপনার{" "}
        <strong>নিবন্ধিত মোবাইল নম্বর বা ইমেইল</strong> উল্লেখ করুন, যাতে আমরা আপনার পরিচয় নিশ্চিত
        করতে পারি। আমাদের অ্যাডমিন পরিচয় যাচাই করে নীতি অনুযায়ী যোগ্য ডাটা মুছে দেবেন।
      </p>

      <section
        className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-neutral-900"
        aria-labelledby="deletion-contact-heading"
      >
        <h2 id="deletion-contact-heading" className="text-lg font-semibold">
          যোগাযোগ / সাপোর্ট
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-base leading-relaxed text-neutral-800">
          <li>
            ফোন:{" "}
            <a className="font-medium text-emerald-800 underline-offset-2 hover:underline" href={DELETION_SUPPORT_PHONE_TEL}>
              {DELETION_SUPPORT_PHONE_DISPLAY}
            </a>
          </li>
          <li>
            WhatsApp:{" "}
            <a
              className="font-medium text-emerald-800 underline-offset-2 hover:underline"
              href={DELETION_WHATSAPP_WA_ME}
              rel="noopener noreferrer"
              target="_blank"
            >
              {DELETION_WHATSAPP_DISPLAY}
            </a>
          </li>
          <li>
            ইমেইল:{" "}
            {emailInfo.isConfigured ? (
              <a
                className="font-medium text-emerald-800 underline-offset-2 hover:underline"
                href={`mailto:${encodeURIComponent(emailInfo.value)}`}
              >
                {emailInfo.value}
              </a>
            ) : (
              <span>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-sm font-medium text-amber-950">
                  প্লেসহোল্ডার — আনুষ্ঠানিক ইমেইল এখনও সেট করা হয়নি
                </span>
                <span className="mt-1 block text-sm text-neutral-600">
                  (ডেভ/সীড ডিফল্ট:{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-neutral-800">{emailInfo.value}</code>
                  )। অনুগ্রহ করে ফোন বা WhatsApp দিয়ে যোগাযোগ করুন।
                </span>
              </span>
            )}
          </li>
        </ul>
      </section>

      <p className="mt-8 text-sm text-neutral-600">
        সম্পর্কিত পৃষ্ঠা:{" "}
        <Link className="font-medium text-emerald-800 underline-offset-2 hover:underline" href="/privacy">
          গোপনীয়তা নীতি
        </Link>
        {" · "}
        <Link className="font-medium text-emerald-800 underline-offset-2 hover:underline" href="/terms">
          শর্তাবলী
        </Link>
        ।
      </p>
    </main>
  );
}
