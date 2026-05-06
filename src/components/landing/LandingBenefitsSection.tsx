import { AppCard } from "@/components/ui/AppCard";

const ITEMS: { icon: string; title: string; body: string }[] = [
  {
    icon: "🏠",
    title: "ঘরে গিয়ে চিকিৎসা",
    body: "পশুর অবস্থা দেখে সরাসরি চিকিৎসা, পরামর্শ ও প্রাথমিক সেবার ব্যবস্থা।",
  },
  {
    icon: "📍",
    title: "আপনার কাছের ডাক্তার",
    body: "আপনার আশেপাশের বিশ্বস্ত ডাক্তারদের সাথে আমরা দ্রুত যোগাযোগ করিয়ে দিই।",
  },
  {
    icon: "🚨",
    title: "জরুরি সহায়তা",
    body: "কোরবানির সময় গুরুতর সমস্যায় দ্রুত পরামর্শ ও পরবর্তী পদক্ষেপের নির্দেশনা।",
  },
  {
    icon: "📋",
    title: "চিকিৎসার আপডেট",
    body: "আপনার আবেদনের পর থেকে চিকিৎসা শেষ হওয়া পর্যন্ত প্রতিটি ধাপের আপডেট জানতে পারবেন।",
  },
];

export function LandingBenefitsSection() {
  return (
    <section className="border-b border-emerald-100/50 bg-white py-8 sm:py-10">
      <div className="mx-auto w-full min-w-0 max-w-3xl px-2 sm:px-3">
        <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
          কেন এই সেবা
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base leading-relaxed text-zinc-700">
          কোরবানির পশুর জরুরি ভেটেরিনারি সহায়তা — এক প্ল্যাটফর্মে।
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {ITEMS.map((c) => (
            <li key={c.title}>
              <AppCard
                variant="default"
                className="h-full rounded-2xl p-5 shadow-md ring-1 ring-zinc-100/80 sm:rounded-3xl"
              >
                <p className="text-2xl" aria-hidden>
                  {c.icon}
                </p>
                <p className="mt-2 text-base font-semibold text-zinc-900">{c.title}</p>
                <p className="mt-1.5 text-base leading-relaxed text-zinc-600">{c.body}</p>
              </AppCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
