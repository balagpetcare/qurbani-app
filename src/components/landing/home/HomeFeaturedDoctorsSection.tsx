"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { HomeDoctorCard } from "@/components/landing/home/HomeDoctorCard";
import { HomeDoctorFilters } from "@/components/landing/home/HomeDoctorFilters";
import {
  applyHomeDoctorFilters,
  HOME_DOCTOR_INITIAL_VISIBLE,
  HOME_DOCTOR_PAGE_SIZE,
  homeDoctorFiltersActive,
  type HomeDoctorFilterState,
} from "@/components/landing/home/home-doctor-filters";
import { landingBtnNeutralOutline } from "@/components/landing/landing-button-classes";
import type { LandingAreaChip } from "@/lib/landing-public-data";
import type { PublicDoctorCard } from "@/lib/public-doctor";

type Props = {
  doctors: PublicDoctorCard[];
  areas: LandingAreaChip[];
  leadFormEnabled: boolean;
};

const EMPTY_FILTERS: HomeDoctorFilterState = {
  areaId: "",
  animalSlug: "",
  fastResponseOnly: false,
  activePanelOnly: false,
};

export function HomeFeaturedDoctorsSection({ doctors, areas, leadFormEnabled }: Props) {
  const [filters, setFilters] = useState<HomeDoctorFilterState>(EMPTY_FILTERS);
  const [visibleCount, setVisibleCount] = useState(HOME_DOCTOR_INITIAL_VISIBLE);

  const filtered = useMemo(() => applyHomeDoctorFilters(doctors, filters), [doctors, filters]);

  useEffect(() => {
    setVisibleCount(HOME_DOCTOR_INITIAL_VISIBLE);
  }, [filters, doctors]);

  const slice = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const canLoadMore = visibleCount < filtered.length;
  const filterDirty = homeDoctorFiltersActive(filters);

  return (
    <section className="border-b border-emerald-100/60 bg-gradient-to-b from-white via-[#fafdfb] to-[#f4faf7] py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl">ডাক্তার খুঁজুন</h2>
            <p className="max-w-xl text-sm text-zinc-600">
              আপনার এলাকা ও প্রয়োজন অনুযায়ী — দ্রুত সাড়া ও হোম ভিজিট।
            </p>
          </div>
          <Link
            href="/doctors"
            className={`mt-2 hidden text-sm sm:mt-0 sm:inline-flex ${landingBtnNeutralOutline} max-w-[11rem]`}
          >
            পূর্ণ তালিকা
          </Link>
        </div>

        {doctors.length === 0 ? (
          <p className="mx-auto mt-6 max-w-md rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-4 text-center text-sm text-zinc-600">
            শীঘ্রই ডাক্তার তালিকা যুক্ত হবে।{" "}
            {leadFormEnabled ? (
              <Link href="/request" className="font-semibold text-emerald-800 underline">
                অনুরোধ ফর্ম
              </Link>
            ) : (
              <span>জরুরি লাইন ব্যবহার করুন।</span>
            )}
          </p>
        ) : (
          <>
            <HomeDoctorFilters areas={areas} value={filters} onChange={setFilters} />

            {filtered.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950">
                এই ফিল্টারে কেউ নেই।{" "}
                <button
                  type="button"
                  className="font-bold underline underline-offset-2"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  ফিল্টার সরান
                </button>
              </p>
            ) : (
              <>
                <ul
                  className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:mt-5 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-x-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-4"
                  aria-label="ডাক্তার তালিকা"
                >
                  {slice.map((d, i) => (
                    <li key={d.id} className="flex shrink-0 snap-center justify-center sm:shrink sm:snap-none sm:block">
                      <HomeDoctorCard
                        doctor={d}
                        leadFormEnabled={leadFormEnabled}
                        listIndex={i}
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-1 flex flex-col items-stretch gap-2 sm:mt-4 sm:flex-row sm:justify-center">
                  {canLoadMore ? (
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCount((v) => Math.min(v + HOME_DOCTOR_PAGE_SIZE, filtered.length))
                      }
                      className={`touch-manipulation ${landingBtnNeutralOutline} sm:max-w-sm`}
                    >
                      আরও ডাক্তার দেখুন (
                      {(filtered.length - visibleCount).toLocaleString("bn-BD")} বাকি)
                    </button>
                  ) : null}
                  <Link
                    href="/doctors"
                    className={`touch-manipulation text-center sm:hidden ${landingBtnNeutralOutline}`}
                  >
                    পূর্ণ তালিকা
                  </Link>
                </div>

                {filterDirty ? (
                  <p className="mt-2 text-center text-[0.7rem] text-zinc-500">
                    মোট {filtered.length.toLocaleString("bn-BD")} জন মিলেছে · সর্বোচ্চ{" "}
                    {doctors.length.toLocaleString("bn-BD")} জন লোড করা
                  </p>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
