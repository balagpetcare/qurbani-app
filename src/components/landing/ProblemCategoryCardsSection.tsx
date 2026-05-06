import Link from "next/link";

import { LANDING_LEAD_FORM_HASH } from "./landing-contact";

const CATEGORIES: { title: string; hint: string }[] = [
  { title: "জ্বর / খাওয়া বন্ধ", hint: "দুর্বলতা, ক্ষুধামান্দ্য" },
  { title: "ফাঁপা পেট / গ্যাস", hint: "ব্লোটিং, গ্যাস ট্র্যাপ সন্দেহ" },
  { title: "পাতলা পায়খানা", hint: "ডায়রিয়া ও পানিশূন্যতা" },
  { title: "কাশি / শ্বাসকষ্ট", hint: "নাক দিয়ে স্রাব, দ্রুত শ্বাস" },
  { title: "ক্ষত / আঘাত", hint: "রক্ত, ফোলা, সংক্রমণ" },
  { title: "বেশি লালা / মুখের ঘা", hint: "মুখগহ্বর, লালা ঝরা" },
  { title: "পা ফোলা / খোঁড়া", hint: "লেমনেস, জয়েন্ট" },
  { title: "জরুরি দুর্বলতা", hint: "দাঁড়াতে পারছে না — দ্রুত যোগাযোগ" },
];

export function ProblemCategoryCardsSection() {
  return (
    <section className="border-b border-zinc-100 bg-zinc-50 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">
          সাধারণ সমস্যা — দ্রুত নির্বাচন করুন
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-600 sm:text-base">
          আপনার সমস্যার কাছাকাছি কার্ডে চাপ দিয়ে ফর্মে নেমে বিস্তারিত লিখুন। আমরা এলাকা
          অনুযায়ী ডাক্তারকে জানাব।
        </p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <li key={c.title}>
              <Link
                href={LANDING_LEAD_FORM_HASH}
                scroll
                className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md active:scale-[0.99]"
              >
                <span className="font-semibold text-zinc-900">{c.title}</span>
                <span className="mt-1.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                  {c.hint}
                </span>
                <span className="mt-3 text-xs font-semibold text-emerald-700">
                  ফর্মে লিখুন →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
