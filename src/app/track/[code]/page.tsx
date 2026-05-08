import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppCard } from "@/components/ui/AppCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { leadStatusLabelBn } from "@/lib/lead-labels-bn";
import { customerBottomNav } from "@/lib/customer-nav";
import { prisma } from "@/lib/prisma";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const p = await getLandingPublicPayloadSafe();
  return { title: `অনুরোধ ট্র্যাক · ${p.publicSiteTitle}` };
}

export default async function TrackByCodePage({ params }: PageProps) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw ?? "").trim();
  if (!code) notFound();

  const lp = await getLandingPublicPayloadSafe();

  const lead = await prisma.lead.findFirst({
    where: { publicTrackingCode: code },
    select: {
      id: true,
      createdAt: true,
      status: true,
      selectedArea: { select: { name: true, nameBn: true } },
    },
  });

  if (!lead) {
    return (
      <AppShell
        variant="customer"
        header={
          <AppHeader
            title="অনুরোধের অবস্থা"
            subtitle="রেফারেন্স কোড"
            backHref="/"
            variant="gradient"
          />
        }
        bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
      >
        <AppCard variant="inset" className="mt-6">
          <p className="font-semibold text-red-800">লিংক সঠিক নয় বা মেয়াদোত্তীর্ণ।</p>
        </AppCard>
        <Link
          href="/request"
          className="mt-8 block text-center text-sm font-semibold text-q-primary underline"
        >
          নতুন অনুরোধ দিন
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell
      variant="customer"
      header={
        <AppHeader
          title="অনুরোধের অবস্থা"
          subtitle="রেফারেন্স কোড দিয়ে দেখুন"
          backHref="/"
          variant="gradient"
        />
      }
      bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
    >
      <AppCard variant="hero" className="mt-2 space-y-3">
        <p className="text-sm font-semibold text-q-muted">রেফারেন্স</p>
        <p className="font-mono text-lg font-bold text-q-primary-deep break-all">{code}</p>
        <p className="text-xs text-q-muted">অভ্যন্তরীণ আইডি #{lead.id}</p>
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

      <p className="mt-6 text-sm text-q-muted">
        পুরনো লিংক?{" "}
        <Link href="/track" className="font-medium text-q-primary underline">
          লিড নম্বর দিয়ে ট্র্যাক
        </Link>
      </p>

      <Link
        href="/request"
        className="mt-8 block text-center text-sm font-semibold text-q-primary underline"
      >
        নতুন অনুরোধ দিন
      </Link>
    </AppShell>
  );
}
