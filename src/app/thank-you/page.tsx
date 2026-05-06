import Link from "next/link";

import { AppCard } from "@/components/ui/AppCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppShell } from "@/components/ui/AppShell";
import { AppSuccessState } from "@/components/ui/AppSuccessState";
import { BottomNav } from "@/components/ui/BottomNav";
import { leadStatusLabelBn } from "@/lib/lead-labels-bn";
import { customerBottomNav } from "@/lib/customer-nav";
import { landingTelHref, landingWhatsAppHref } from "@/components/landing/landing-contact";
import { prisma } from "@/lib/prisma";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s.trim() || undefined;
}

export default async function ThankYouPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const leadIdRaw = firstParam(sp.leadId);
  const leadId =
    leadIdRaw && !Number.isNaN(parseInt(leadIdRaw, 10))
      ? parseInt(leadIdRaw, 10)
      : undefined;

  const lp = await getLandingPublicPayloadSafe();
  const telHref = landingTelHref(lp.phoneCallDigits);
  const waHref = landingWhatsAppHref(lp.whatsappDigits);

  const lead =
    leadId !== undefined
      ? await prisma.lead.findUnique({
          where: { id: leadId },
          select: {
            id: true,
            createdAt: true,
            status: true,
            selectedArea: { select: { name: true, nameBn: true } },
          },
        })
      : null;

  return (
    <AppShell
      variant="customer"
      header={
        <AppHeader
          title="ধন্যবাদ"
          subtitle="অনুরোধ গ্রহণ"
          backHref="/"
          variant="gradient"
        />
      }
      bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
    >
      <AppSuccessState
        title="আপনার অনুরোধ গ্রহণ করা হয়েছে"
        message={
          lp.thankYouMessage.trim()
            ? lp.thankYouMessage.trim()
            : "আমরা যত দ্রুত সম্ভব আপনার দেওয়া নম্বরে কল বা মেসেজ করে ফিরব।"
        }
      />

      {lead ? (
        <AppCard variant="default" className="mt-6 space-y-2 text-sm">
          <p>
            <span className="text-q-muted">অনুরোধ আইডি:</span>{" "}
            <span className="font-mono font-bold text-q-primary-deep">#{lead.id}</span>
          </p>
          <p>
            <span className="text-q-muted">জমার সময়:</span>{" "}
            {lead.createdAt.toLocaleString("bn-BD", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p>
            <span className="text-q-muted">এলাকা:</span>{" "}
            {lead.selectedArea?.nameBn ?? lead.selectedArea?.name ?? "—"}
          </p>
          <p>
            <span className="text-q-muted">স্ট্যাটাস:</span>{" "}
            <span className="font-semibold">{leadStatusLabelBn(lead.status)}</span>
          </p>
          <Link
            href={`/track?leadId=${lead.id}`}
            className="mt-3 inline-block text-sm font-semibold text-q-primary underline"
          >
            ট্র্যাকিং পেজে দেখুন →
          </Link>
        </AppCard>
      ) : leadId !== undefined ? (
        <p className="mt-4 text-center text-sm text-amber-800">
          রেফারেন্স #{leadId} খুঁজে পাওয়া যায়নি — তবুও আপনার জমা সফল হতে পারে।
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={telHref}
          className="inline-flex min-h-[var(--q-touch-min)] flex-1 items-center justify-center rounded-2xl bg-q-primary px-6 text-base font-bold text-white shadow-md touch-manipulation hover:bg-q-primary-deep"
        >
          এখনই কল করুন
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[var(--q-touch-min)] flex-1 items-center justify-center rounded-2xl border-2 border-q-primary bg-white px-6 text-base font-bold text-q-primary-deep shadow-sm touch-manipulation hover:bg-q-primary-soft"
        >
          WhatsApp
        </a>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/"
          className="inline-flex min-h-[var(--q-touch-min)] items-center justify-center rounded-2xl border border-zinc-200 px-6 text-sm font-semibold text-zinc-800 touch-manipulation hover:bg-zinc-50"
        >
          হোমপেজে ফিরুন
        </Link>
      </div>
    </AppShell>
  );
}
