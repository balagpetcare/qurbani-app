import type { LandingHomeStats } from "@/lib/landing-public-data";

function bn(n: number): string {
  return n.toLocaleString("bn-BD");
}

type Props = { stats: LandingHomeStats };

export function HomeLiveActivitySection({ stats }: Props) {
  const rows = [
    {
      label: "চিকিৎসা চলছে",
      value: `${bn(stats.activeTreatments)}টি`,
      hint: "অ্যাসাইনড / চলমান কেস",
    },
    {
      label: "সক্রিয় ডাক্তার",
      value: `${bn(stats.doctorCount)} জন`,
      hint: "প্যানেলে নিবন্ধিত",
    },
    {
      label: "আজ ভিজিট সূচি",
      value: `${bn(stats.visitsScheduledToday)}টি`,
      hint: "আজকের পছন্দের তারিখ",
    },
    {
      label: "আজ নতুন অনুরোধ",
      value: `${bn(stats.todayRequests)}টি`,
      hint: "২৪ ঘণ্টা নয় — আজ (ঢাকা)",
    },
  ];

  return (
    <section className="border-b border-emerald-100/60 bg-gradient-to-b from-[#0f3d2a] to-emerald-950 py-6 text-white sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        <h2 className="text-center text-lg font-bold sm:text-xl">লাইভ অপারেশন সারাংশ</h2>
        <p className="mx-auto mt-1 max-w-md text-pretty text-center text-xs text-emerald-100/90">
          জরুরি রেসপন্স টিম — কেস মনিটরিং চলছে।
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {rows.map((r) => (
            <li
              key={r.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center shadow-inner backdrop-blur-sm"
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-100/85">{r.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white sm:text-xl">{r.value}</p>
              <p className="mt-1 text-[0.6rem] leading-tight text-emerald-100/75">{r.hint}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
