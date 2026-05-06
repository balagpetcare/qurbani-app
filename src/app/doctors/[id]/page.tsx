import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppBadge } from "@/components/ui/AppBadge";
import { AppCard } from "@/components/ui/AppCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { LANDING_REQUEST_PATH } from "@/components/landing/landing-contact";
import { customerBottomNav } from "@/lib/customer-nav";
import { getPublicDoctorById } from "@/lib/landing-public-data";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  const p = await getLandingPublicPayloadSafe();
  if (Number.isNaN(id)) return { title: `ডাক্তার · ${p.publicSiteTitle}` };
  const d = await getPublicDoctorById(id);
  return {
    title: d ? `${d.name} · ${p.publicSiteTitle}` : `ডাক্তার · ${p.publicSiteTitle}`,
  };
}

export default async function PublicDoctorDetailPage({ params }: Props) {
  const lp = await getLandingPublicPayloadSafe();
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) notFound();

  const doctor = await getPublicDoctorById(id);
  if (!doctor) notFound();

  const bio =
    doctor.shortBio?.trim() ||
    doctor.qualification?.trim() ||
    doctor.experienceBlurb;

  return (
    <AppShell
      variant="customer"
      contentMax="wide"
      header={
        <AppHeader
          title={doctor.name}
          subtitle="পাবলিক প্রোফাইল"
          backHref="/doctors"
          backLabel="তালিকা"
          variant="gradient"
        />
      }
      bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
    >
      <AppCard variant="hero" className="flex flex-col items-center text-center">
        <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-3xl bg-q-primary-soft ring-2 ring-emerald-900/10">
          {doctor.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doctor.profilePhotoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl">
              🐄
            </div>
          )}
        </div>
        {doctor.availabilityLabel ? (
          <AppBadge tone="success">{doctor.availabilityLabel}</AppBadge>
        ) : null}
        {doctor.ratingLabel ? (
          <p className="mt-2 text-sm font-semibold text-amber-800">{doctor.ratingLabel}</p>
        ) : null}
        <p className="mt-3 text-sm font-medium text-q-muted">{doctor.areaLabel}</p>
        <p className="mt-3 w-full text-sm font-bold text-emerald-950">{doctor.feeLineBn}</p>
        {doctor.feeNote ? (
          <p className="mt-1 w-full text-xs text-zinc-600">{doctor.feeNote}</p>
        ) : null}
        {doctor.availableTimeText ? (
          <p className="mt-2 w-full text-left text-sm text-zinc-700">
            <span className="font-semibold text-zinc-800">সময়সূচি: </span>
            {doctor.availableTimeText}
          </p>
        ) : null}
        <p className="mt-4 w-full text-left text-sm leading-relaxed text-zinc-800">{bio}</p>
        <Link
          href={LANDING_REQUEST_PATH}
          className="mt-6 inline-flex min-h-[var(--q-touch-min)] w-full max-w-sm items-center justify-center rounded-2xl bg-[var(--q-accent-gold)] px-5 text-sm font-bold text-emerald-950 shadow-md touch-manipulation"
        >
          চিকিৎসা অনুরোধ করুন
        </Link>
      </AppCard>

      <p className="mt-6 text-center text-xs text-q-muted">
        ফোন বা WhatsApp নম্বর প্রদর্শিত হয় না। চিকিৎসার জন্য{" "}
        <Link href="/request" className="font-semibold text-q-primary underline">
          অনুরোধ ফর্ম
        </Link>{" "}
        ব্যবহার করুন।
      </p>
    </AppShell>
  );
}
