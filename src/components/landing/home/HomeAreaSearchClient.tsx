"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SearchableAreaSelect } from "@/components/forms/SearchableAreaSelect";
import { landingBtnNeutralOutline, landingBtnSolidPrimary } from "@/components/landing/landing-button-classes";
import { LANDING_REQUEST_PATH } from "@/components/landing/landing-contact";
import type { LandingAreaChip } from "@/lib/landing-public-data";

type Props = {
  areas: LandingAreaChip[];
  leadFormEnabled: boolean;
};

export function HomeAreaSearchClient({ areas, leadFormEnabled }: Props) {
  const router = useRouter();
  const [areaId, setAreaId] = useState<number | "">("");

  const options = useMemo(
    () =>
      areas.map((a) => ({
        id: a.id,
        name: a.name,
        nameBn: a.nameBn,
        nameEn: a.nameEn,
      })),
    [areas],
  );

  const popular = useMemo(() => {
    const pop = areas.filter((a) => a.isPopular);
    return (pop.length ? pop : areas).slice(0, 10);
  }, [areas]);

  function goRequest() {
    if (!leadFormEnabled) return;
    if (areaId === "") {
      router.push(LANDING_REQUEST_PATH);
      return;
    }
    router.push(`${LANDING_REQUEST_PATH}?area=${areaId}`);
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      {options.length === 0 ? (
        <p className="text-center text-sm text-zinc-600">
          এলাকার তালিকা লোড হচ্ছে। সরাসরি{" "}
          <Link href={LANDING_REQUEST_PATH} className="font-semibold text-emerald-800 underline">
            অনুরোধ ফর্ম
          </Link>
          -এ যান।
        </p>
      ) : (
        <>
          <SearchableAreaSelect
            areas={options}
            name="landing-area"
            label="আপনার সেবা এলাকা"
            placeholder="খুঁজে এলাকা বেছে নিন…"
            value={areaId}
            onChange={setAreaId}
            hint="নির্বাচন করে দ্রুত ফর্মে যেতে পারবেন।"
          />
          {leadFormEnabled ? (
            <button
              type="button"
              onClick={goRequest}
              className={`w-full touch-manipulation ${landingBtnSolidPrimary}`}
            >
              {areaId === "" ? "অনুরোধ ফর্মে যান" : "এই এলাকায় অনুরোধ করুন"}
            </button>
          ) : null}
        </>
      )}

      {popular.length > 0 ? (
        <div>
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
            জনপ্রিয় এলাকা
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]">
            {popular.map((a) => (
              <Link
                key={a.id}
                href={`${LANDING_REQUEST_PATH}?area=${a.id}`}
                className="shrink-0 touch-manipulation rounded-full border border-emerald-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950 shadow-sm ring-1 ring-emerald-100/70"
              >
                {a.nameBn ?? a.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/doctors" className={`touch-manipulation ${landingBtnNeutralOutline}`}>
          সব ডাক্তার
        </Link>
      </div>
    </div>
  );
}
