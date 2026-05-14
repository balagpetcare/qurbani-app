import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Bengali } from "next/font/google";

import { GoogleAdsRootScripts } from "@/components/analytics/GoogleAdsRootScripts";
import "./globals.css";

const appSans = Noto_Sans_Bengali({
  variable: "--font-app-sans",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? undefined;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#064e3b",
};

export const metadata: Metadata = {
  metadataBase: appUrl ? new URL(`${appUrl}/`) : undefined,
  applicationName: "Quarbani 2026",
  title: {
    default: "Quarbani 2026 — কুরবানি ভেটেরিনারি সহায়তা",
    template: "%s · Quarbani 2026",
  },
  description:
    "কোরবানির পশুর জন্য দ্রুত ও নির্ভরযোগ্য ভেটেরিনারি সহায়তা — কল, WhatsApp ও ডাক্তার অনুরোধ।",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Quarbani 2026",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: appUrl
    ? {
        type: "website",
        locale: "bn_BD",
        siteName: "Quarbani 2026",
        title: "Quarbani 2026 — কুরবানি ভেটেরিনারি সহায়তা",
        description:
          "কোরবানির পশুর জন্য দ্রুত ভেটেরিনারি সহায়তা — কল, WhatsApp ও ডাক্তার অনুরোধ।",
        url: appUrl,
      }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${appSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-[100dvh] min-w-0 flex-col">
        <GoogleAdsRootScripts />
        {children}
      </body>
    </html>
  );
}
