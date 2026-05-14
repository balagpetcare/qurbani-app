import type { LandingHomeStats } from "@/lib/landing-public-data";

function bn(n: number): string {
  return n.toLocaleString("bn-BD");
}

type Props = { stats: LandingHomeStats };

export function HomeLiveStatsSection({ stats }: Props) {
  const items = [
    { icon: "👨‍⚕️", label: "মোট ডাক্তার", value: `${bn(stats.doctorCount)} জন` },
    { icon: "🟢", label: "চলমান চিকিৎসা", value: `${bn(stats.activeTreatments)}টি` },
    { icon: "📋", label: "আজকের অনুরোধ", value: `${bn(stats.todayRequests)}টি` },
    {
      icon: "✅",
      label: "সম্পন্ন সেবা",
      value: stats.completedServices >= 1000 ? `${bn(stats.completedServices)}+` : `${bn(stats.completedServices)}`,
    },
  ];

  return (
    <section className="border-b border-emerald-100/60 bg-[#f3faf6] py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        <h2 className="text-center text-lg font-bold text-zinc-900 sm:text-xl">প্ল্যাটফর্ম সংক্ষেপে</h2>
        <p className="mx-auto mt-1 max-w-lg text-pretty text-center text-xs text-zinc-600">
          সংখ্যাগুলো সরাসরি সিস্টেম থেকে — ভবিষ্যতে আরও বিশ্লেষণ যুক্ত করা যাবে।
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {items.map((it) => (
            <li
              key={it.label}
              className="rounded-2xl border border-white/80 bg-white/95 px-3 py-3 text-center shadow-sm ring-1 ring-emerald-100/40 sm:px-4 sm:py-4"
            >
              <div className="text-lg sm:text-xl" aria-hidden>
                {it.icon}
              </div>
              <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">
                {it.label}
              </p>
              <p className="mt-0.5 text-sm font-bold leading-tight text-emerald-950 sm:text-base">{it.value}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
