import Link from "next/link";

import { DoctorApplicationForm } from "@/components/landing/DoctorApplicationForm";
import { DoctorApplyPageHeader } from "@/components/doctor/DoctorApplyPageHeader";
import { AppCard } from "@/components/ui/AppCard";
import { AppShell } from "@/components/ui/AppShell";
import { getDoctorApplicationsEnabled } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** Matches `DoctorLoginClient`: safe internal redirect after successful login. */
const DOCTOR_LOGIN_HREF = "/doctor/login?from=/doctor";

export default async function DoctorApplyPage() {
  const applicationsOpen = await getDoctorApplicationsEnabled();

  return (
    <AppShell
      variant="doctor"
      header={<DoctorApplyPageHeader />}
    >
      <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 py-4 sm:py-6">
        <AppCard variant="default" className="p-5 sm:p-6">
          <h2
            id="doctor-apply-existing-account-heading"
            className="text-base font-bold leading-snug text-zinc-900 sm:text-lg"
          >
            ইতোমধ্যে অ্যাকাউন্ট আছে?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-q-muted sm:text-base">
            আপনি যদি আগে থেকেই ডাক্তার অ্যাকাউন্ট পেয়ে থাকেন, তাহলে এখান থেকে লগইন করুন।
          </p>
          <Link
            href={DOCTOR_LOGIN_HREF}
            className="mt-4 inline-flex min-h-[var(--q-touch-min)] w-full touch-manipulation items-center justify-center rounded-2xl border-2 border-zinc-800 bg-zinc-900 px-5 text-base font-bold text-white shadow-sm transition hover:bg-zinc-800 sm:w-auto"
          >
            ডাক্তার লগইন করুন
          </Link>
        </AppCard>

        {applicationsOpen ? (
          <>
            <DoctorApplicationForm />
            <div className="border-t border-zinc-200 pt-6 text-center">
              <p className="text-sm text-q-muted">ইতোমধ্যে নিবন্ধিত?</p>
              <Link
                href={DOCTOR_LOGIN_HREF}
                className="mt-3 inline-flex min-h-[var(--q-touch-min)] touch-manipulation items-center justify-center rounded-2xl px-4 text-base font-bold text-q-primary-deep underline-offset-2 hover:underline"
              >
                ডাক্তার লগইন করুন →
              </Link>
            </div>
          </>
        ) : (
          <AppCard variant="default" className="border-amber-200 bg-amber-50 p-6 text-center text-amber-950">
            <h1 className="text-lg font-bold">আবেদন ফর্ম বন্ধ</h1>
            <p className="mt-3 text-sm leading-relaxed text-amber-900/90">
              এখন নতুন ডাক্তার আবেদন গ্রহণ করা হচ্ছে না। পরে আবার চেষ্টা করুন বা সরাসরি
              যোগাযোগ করুন।
            </p>
            <p className="mt-4">
              <Link href="/" className="text-sm font-bold text-q-primary-deep underline">
                হোমে ফিরুন
              </Link>
            </p>
          </AppCard>
        )}
      </div>
    </AppShell>
  );
}
