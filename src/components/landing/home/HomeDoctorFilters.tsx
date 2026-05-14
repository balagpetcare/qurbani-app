"use client";

import type { LandingAreaChip } from "@/lib/landing-public-data";
import type { PublicDoctorAnimalFocusSlug } from "@/lib/public-doctor";

import type { HomeDoctorFilterState } from "./home-doctor-filters";
import { homeDoctorFiltersActive } from "./home-doctor-filters";

const ANIMAL_OPTIONS: { slug: PublicDoctorAnimalFocusSlug; label: string }[] = [
  { slug: "cow", label: "গরু" },
  { slug: "goat", label: "ছাগল" },
  { slug: "buffalo", label: "মহিষ" },
  { slug: "sheep", label: "ভেড়া" },
];

type Props = {
  areas: LandingAreaChip[];
  value: HomeDoctorFilterState;
  onChange: (next: HomeDoctorFilterState) => void;
};

const selectClass =
  "min-h-[40px] w-full min-w-0 rounded-xl border border-emerald-200/90 bg-white px-2.5 py-2 text-sm font-medium text-zinc-900 shadow-sm outline-none ring-emerald-500/20 focus:ring-2";

const chipClass =
  "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold touch-manipulation transition";

export function HomeDoctorFilters({ areas, value, onChange }: Props) {
  const dirty = homeDoctorFiltersActive(value);

  function patch(p: Partial<HomeDoctorFilterState>) {
    onChange({ ...value, ...p });
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-b from-[#f7fcfa] to-white p-3 shadow-sm ring-1 ring-emerald-50/80 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-900/80">ফিল্টার</p>
        {dirty ? (
          <button
            type="button"
            className="text-xs font-semibold text-emerald-700 underline underline-offset-2"
            onClick={() =>
              onChange({
                areaId: "",
                animalSlug: "",
                fastResponseOnly: false,
                activePanelOnly: false,
              })
            }
          >
            সব খুলুন
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="min-w-0">
          <span className="mb-1 block text-[0.65rem] font-semibold text-zinc-500">এলাকা</span>
          <select
            className={selectClass}
            value={value.areaId === "" ? "" : String(value.areaId)}
            onChange={(e) => {
              const v = e.target.value;
              patch({ areaId: v === "" ? "" : Number(v) });
            }}
            aria-label="এলাকা অনুসারে ফিল্টার"
          >
            <option value="">সব এলাকা</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nameBn ?? a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="mb-1 block text-[0.65rem] font-semibold text-zinc-500">পশুর ধরন</span>
          <select
            className={selectClass}
            value={value.animalSlug}
            onChange={(e) => {
              const v = e.target.value;
              const slug =
                v === "" || ANIMAL_OPTIONS.some((o) => o.slug === v)
                  ? (v as PublicDoctorAnimalFocusSlug | "")
                  : "";
              patch({ animalSlug: slug });
            }}
            aria-label="পশুর ধরন অনুসারে ফিল্টার"
          >
            <option value="">সব ধরন</option>
            {ANIMAL_OPTIONS.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-2 sm:items-end">
          <button
            type="button"
            aria-pressed={value.fastResponseOnly}
            onClick={() => patch({ fastResponseOnly: !value.fastResponseOnly })}
            className={`${chipClass} ${
              value.fastResponseOnly
                ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                : "border-emerald-200/90 bg-white text-emerald-900 hover:bg-emerald-50"
            }`}
          >
            ⚡ দ্রুত সাড়া
          </button>
          <button
            type="button"
            aria-pressed={value.activePanelOnly}
            onClick={() => patch({ activePanelOnly: !value.activePanelOnly })}
            className={`${chipClass} ${
              value.activePanelOnly
                ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                : "border-emerald-200/90 bg-white text-emerald-900 hover:bg-emerald-50"
            }`}
          >
            🟢 সক্রিয় ডাক্তার
          </button>
        </div>
      </div>
    </div>
  );
}
