import Link from "next/link";

import { AppShell } from "@/components/ui/AppShell";
import { AppHeader } from "@/components/ui/AppHeader";

import { AcceptLeadClient } from "./AcceptLeadClient";

type PageProps = { params: Promise<{ token: string }> };

export default async function AcceptLeadPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw ?? "").trim();
  if (!token) {
    return (
      <AppShell
        variant="customer"
        header={
          <AppHeader title="লিড গ্রহণ" subtitle="কুরবানি ২০২৬" backHref="/" />
        }
      >
        <p className="p-6 text-sm text-zinc-600">অবৈধ লিংক।</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      variant="customer"
      header={
        <AppHeader
          title="লিড গ্রহণ"
          subtitle="কুরবানি ২০২৬ · নিরাপদ লিংক"
          backHref="/"
        />
      }
    >
      <div className="mx-auto max-w-lg px-4 py-8">
        <AcceptLeadClient token={token} />
        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/" className="underline">
            হোম
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
