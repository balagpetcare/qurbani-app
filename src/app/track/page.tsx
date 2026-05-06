import type { Metadata } from "next";
import Link from "next/link";

import { AppCard } from "@/components/ui/AppCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { leadStatusLabelBn } from "@/lib/lead-labels-bn";
import { customerBottomNav } from "@/lib/customer-nav";
import { prisma } from "@/lib/prisma";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s.trim() || undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await getLandingPublicPayloadSafe();
  return { title: `অনুরোধ ট্র্যাক · ${p.publicSiteTitle}` };
}

export default async function TrackRequestPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const raw = first(sp.leadId);
  const leadId =
    raw && !Number.isNaN(parseInt(raw, 10)) ? parseInt(raw, 10) : undefined;

  const lp = await getLandingPublicPayloadSafe();

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
          title="অনুরোধের অবস্থা"
          subtitle="রেফারেন্স নম্বর দিয়ে দেখুন"
          backHref="/"
          variant="gradient"
        />
      }
      bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
    >
      <p className="text-sm text-q-muted">
        URL-এ <span className="font-mono">?leadId=</span> আপনার লিড নম্বর যোগ করুন
        (ধন্যবাদ পেজ থেকে লিংক পাবেন)।
      </p>

      {leadId === undefined ? (
        <AppCard variant="inset" className="mt-6">
          <p className="text-sm text-zinc-700">
            উদাহরণ:{" "}
            <Link href="/track?leadId=1" className="font-mono text-q-primary underline">
              /track?leadId=1
            </Link>
          </p>
        </AppCard>
      ) : !lead ? (
        <AppCard variant="inset" className="mt-6">
          <p className="font-semibold text-red-800">লিড #{leadId} পাওয়া যায়নি।</p>
        </AppCard>
      ) : (
        <AppCard variant="hero" className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-q-muted">লিড নম্বর</p>
          <p className="text-2xl font-bold text-q-primary-deep">#{lead.id}</p>
          <div className="border-t border-zinc-100 pt-3 text-sm">
            <p>
              <span className="text-q-muted">জমা:</span>{" "}
              {lead.createdAt.toLocaleString("bn-BD", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p className="mt-1">
              <span className="text-q-muted">এলাকা:</span>{" "}
              {lead.selectedArea?.nameBn ?? lead.selectedArea?.name ?? "—"}
            </p>
            <p className="mt-1">
              <span className="text-q-muted">স্ট্যাটাস:</span>{" "}
              <span className="font-semibold text-q-primary-deep">
                {leadStatusLabelBn(lead.status)}
              </span>
            </p>
          </div>
        </AppCard>
      )}

      <Link
        href="/request"
        className="mt-8 block text-center text-sm font-semibold text-q-primary underline"
      >
        নতুন অনুরোধ দিন
      </Link>
    </AppShell>
  );
}
