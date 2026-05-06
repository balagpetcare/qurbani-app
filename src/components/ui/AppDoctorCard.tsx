import Link from "next/link";

import { AppBadge } from "@/components/ui/AppBadge";
import { AppCard } from "@/components/ui/AppCard";
import type { PublicDoctorCard } from "@/lib/public-doctor";

import { LANDING_REQUEST_PATH } from "@/components/landing/landing-contact";

type Props = {
  doctor: PublicDoctorCard;
  detailHref: string;
  detailLabel?: string;
  className?: string;
};

export function AppDoctorCard({
  doctor,
  detailHref,
  detailLabel = "প্রোফাইল",
  className = "",
}: Props) {
  const sub =
    doctor.qualification?.trim() ||
    doctor.shortBio?.trim()?.slice(0, 120) ||
    doctor.experienceBlurb;

  return (
    <AppCard variant="default" className={className}>
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-q-primary-soft ring-1 ring-emerald-900/10">
          {doctor.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote URLs not in next/image config
            <img
              src={doctor.profilePhotoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-q-primary">
              🐄
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-zinc-900">ডাঃ {doctor.name}</p>
            {doctor.availabilityLabel ? (
              <AppBadge tone="success">{doctor.availabilityLabel}</AppBadge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-medium text-q-muted">{doctor.areaLabel}</p>
          {doctor.ratingLabel ? (
            <p className="mt-1 text-xs font-semibold text-amber-800">{doctor.ratingLabel}</p>
          ) : null}
          <p className="mt-1.5 text-sm font-semibold text-emerald-900">{doctor.feeLineBn}</p>
          {doctor.feeNote ? (
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{doctor.feeNote}</p>
          ) : null}
          {doctor.availableTimeText ? (
            <p className="mt-1 text-xs font-medium text-zinc-600">
              সময়: {doctor.availableTimeText}
            </p>
          ) : null}
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-700">{sub}</p>
          <p className="mt-2 text-xs text-q-muted">
            সম্পন্ন কেস: {doctor.completedCount.toLocaleString("bn-BD")}+
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href={LANDING_REQUEST_PATH}
          className="inline-flex min-h-[var(--q-touch-min)] w-full items-center justify-center rounded-2xl bg-[var(--q-accent-gold)] px-4 text-sm font-bold text-emerald-950 shadow-md touch-manipulation transition-opacity hover:opacity-95"
        >
          চিকিৎসা অনুরোধ করুন
        </Link>
        <Link
          href={detailHref}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 touch-manipulation hover:bg-zinc-50"
        >
          {detailLabel}
        </Link>
      </div>
    </AppCard>
  );
}
