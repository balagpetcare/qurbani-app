import Script from "next/script";

import { GOOGLE_ADS_MEASUREMENT_ID } from "@/lib/analytics/googleAds";

/**
 * Global Google tag for Ads. Mount once in `src/app/layout.tsx`.
 * Stable `id` values let `next/script` avoid injecting duplicate tags on navigations.
 */
export function GoogleAdsRootScripts() {
  const id = GOOGLE_ADS_MEASUREMENT_ID;
  return (
    <>
      <Script
        id="google-ads-gtag-js"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <Script id="google-ads-gtag-inline" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');
        `.trim()}
      </Script>
    </>
  );
}
