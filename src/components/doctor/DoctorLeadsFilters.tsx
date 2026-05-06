import Link from "next/link";

import { AppCard } from "@/components/ui/AppCard";
import type { DoctorLeadsTab } from "@/lib/doctor-lead-access";

type AreaOpt = { id: number; name: string };

function href(tab: DoctorLeadsTab, areaId?: number) {
  const p = new URLSearchParams();
  if (tab !== "all") p.set("tab", tab);
  if (areaId != null) p.set("area", String(areaId));
  const q = p.toString();
  return q ? `/doctor/leads?${q}` : "/doctor/leads";
}

const TABS: { id: DoctorLeadsTab; label: string }[] = [
  { id: "all", label: "সব" },
  { id: "new", label: "নতুন" },
  { id: "active", label: "চলমান" },
  { id: "mine", label: "আমার কেস" },
  { id: "pool", label: "পুল" },
  { id: "emergency", label: "ইমারজেন্সি" },
  { id: "completed", label: "সম্পন্ন" },
];

type Props = {
  tab: DoctorLeadsTab;
  areaId?: number;
  areas: AreaOpt[];
};

export function DoctorLeadsFilters({ tab, areaId, areas }: Props) {
  return (
    <AppCard variant="flat" className="mt-3 !p-3 sm:mt-4 sm:!p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-q-muted">ভিউ</p>
      <div className="-mx-0.5 mt-2 flex snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto scroll-smooth pb-1 touch-pan-x overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:mt-3 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:pb-0 sm:snap-none [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <Link
              key={id}
              href={href(id, areaId)}
              className={`shrink-0 snap-start rounded-full border px-3.5 py-2 text-[11px] font-semibold whitespace-nowrap transition touch-manipulation sm:px-4 sm:py-2.5 sm:text-xs ${
                active
                  ? "border-q-primary bg-q-primary text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {areas.length > 0 ? (
        <>
          <div className="mt-3 border-t border-emerald-900/10 pt-3 sm:mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-q-muted">এলাকা ফিল্টার</p>
          </div>
          <form method="get" className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
            {tab !== "all" ? <input type="hidden" name="tab" value={tab} /> : null}
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-zinc-700 sm:min-w-[12rem] sm:flex-none">
              এলাকা
              <select
                name="area"
                defaultValue={areaId ?? ""}
                className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-q-primary focus:ring-2 focus:ring-q-primary/20 sm:min-w-[10rem] sm:rounded-2xl"
              >
                <option value="">সব এলাকা</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="min-h-[48px] w-full shrink-0 rounded-2xl border-2 border-q-primary bg-q-primary-soft px-5 text-sm font-bold text-q-primary-deep touch-manipulation hover:bg-emerald-100 sm:w-auto"
            >
              ফিল্টার করুন
            </button>
            <Link
              href={href(tab)}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-2 text-center text-sm font-semibold text-zinc-700 touch-manipulation hover:bg-zinc-50 sm:w-auto sm:border-0 sm:bg-transparent sm:py-0 sm:text-q-muted sm:underline-offset-2 sm:hover:text-zinc-800 sm:hover:underline"
            >
              ফিল্টার মুছুন
            </Link>
          </form>
        </>
      ) : null}
    </AppCard>
  );
}
