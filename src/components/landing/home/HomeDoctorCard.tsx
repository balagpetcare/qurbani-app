import Link from "next/link";
import { memo } from "react";

import { landingBtnSolidPrimary } from "@/components/landing/landing-button-classes";
import { LANDING_REQUEST_PATH } from "@/components/landing/landing-contact";
import type { PublicDoctorCard } from "@/lib/public-doctor";

function clip(s: string | null | undefined, max: number): string {
  const t = (s ?? "").trim();
  if (!t) return "ভেটেরিনারি";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function displayRatingBn(done: number): string | null {
  if (done < 2) return null;
  const base = done >= 45 ? 4.9 : done >= 18 ? 4.85 : done >= 8 ? 4.8 : 4.75;
  return base.toLocaleString("bn-BD", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function presenceFromCode(code: string | undefined | null): {
  emoji: string;
  label: string;
  barClass: string;
} {
  const c = (code ?? "").trim().toUpperCase();
  if (c === "AVAILABLE") {
    return {
      emoji: "🟢",
      label: "এখন সক্রিয়",
      barClass: "bg-emerald-600/10 text-emerald-900",
    };
  }
  if (c === "LIMITED") {
    return {
      emoji: "🟡",
      label: "ব্যস্ত",
      barClass: "bg-amber-500/12 text-amber-950",
    };
  }
  return {
    emoji: "⚪",
    label: "অফলাইন",
    barClass: "bg-zinc-100 text-zinc-600",
  };
}

export type HomeDoctorCardProps = {
  doctor: PublicDoctorCard;
  leadFormEnabled: boolean;
  /** For image lazy-loading after first screen of cards. */
  listIndex: number;
};

function HomeDoctorCardInner({ doctor, leadFormEnabled, listIndex }: HomeDoctorCardProps) {
  const spec = clip(doctor.qualification, 32);
  const areas = clip(doctor.areaLabel, 40);
  const ratingBn = displayRatingBn(doctor.completedCount);
  const homeVisit =
    (typeof doctor.homeVisitFeeMin === "number" && doctor.homeVisitFeeMin > 0) ||
    (typeof doctor.homeVisitFeeMax === "number" && doctor.homeVisitFeeMax > 0);
  const code = doctor.availabilityStatusCode;
  const fast = (code ?? "").trim().toUpperCase() === "AVAILABLE";
  const presence = presenceFromCode(code);
  const requestHref =
    leadFormEnabled && doctor.primaryAreaId
      ? `${LANDING_REQUEST_PATH}?area=${doctor.primaryAreaId}`
      : LANDING_REQUEST_PATH;

  const imgLoading = listIndex >= 6 ? "lazy" : "eager";

  return (
    <article className="flex h-full w-[15.25rem] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-[0_6px_22px_-10px_rgba(15,80,55,0.35)] ring-1 ring-emerald-50/90 transition hover:border-emerald-200/90 hover:shadow-[0_10px_28px_-12px_rgba(15,80,55,0.4)] sm:w-full sm:max-w-[17.5rem] sm:snap-align-none md:max-w-none">
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-[0.68rem] font-bold leading-none ${presence.barClass}`}
      >
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          <span aria-hidden>{presence.emoji}</span>
          <span className="truncate">{presence.label}</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2.5">
        <div className="flex gap-2.5">
          <div className="relative h-[3.75rem] w-[3.75rem] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 ring-1 ring-emerald-100">
            {doctor.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- doctor URLs may be arbitrary external storage
              <img
                src={doctor.profilePhotoUrl}
                alt={doctor.name}
                width={60}
                height={60}
                loading={imgLoading}
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-lg font-bold text-emerald-800"
                aria-hidden
              >
                {(doctor.name.trim().charAt(0) || "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold leading-tight text-zinc-900">{doctor.name}</h3>
            <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-snug text-zinc-600">{spec}</p>
            {doctor.yearsExperienceBn ? (
              <p className="mt-1 text-[0.65rem] font-semibold text-emerald-800">{doctor.yearsExperienceBn}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-2 line-clamp-1 text-[0.68rem] leading-tight text-zinc-500">{areas}</p>

        <div className="mt-2 flex min-h-[1.75rem] flex-wrap content-start gap-1">
          {fast ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.62rem] font-bold text-amber-950 ring-1 ring-amber-100/90">
              ⚡ দ্রুত সাড়া
            </span>
          ) : null}
          {homeVisit ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-900 ring-1 ring-emerald-100/90">
              🏠 বাসায় ভিজিট
            </span>
          ) : null}
          {ratingBn ? (
            <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-[0.62rem] font-bold text-zinc-800 ring-1 ring-zinc-100">
              ⭐ {ratingBn} রেটিং
            </span>
          ) : (
            <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-[0.62rem] font-semibold text-zinc-500 ring-1 ring-zinc-100">
              নতুন যুক্ত
            </span>
          )}
        </div>

        <p className="mt-auto pt-2 text-[0.68rem] font-semibold tabular-nums text-emerald-900">
          {doctor.completedCount > 0 ? (
            <>
              <span className="text-zinc-500">সম্পন্ন </span>
              {doctor.completedCount.toLocaleString("bn-BD")}+
            </>
          ) : (
            <span className="text-zinc-500">কেস তালিকা শীঘ্রই</span>
          )}
        </p>

        <div className="mt-2 flex flex-col gap-1.5 border-t border-emerald-50/90 pt-2.5">
          {leadFormEnabled ? (
            <Link
              href={requestHref}
              className={`text-center text-sm font-bold shadow-sm ${landingBtnSolidPrimary}`}
            >
              অনুরোধ পাঠান
            </Link>
          ) : null}
          <Link
            href={`/doctors/${doctor.id}`}
            className="min-h-[36px] text-center text-xs font-bold leading-9 text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
          >
            বিস্তারিত দেখুন
          </Link>
        </div>
      </div>
    </article>
  );
}

export const HomeDoctorCard = memo(HomeDoctorCardInner);
