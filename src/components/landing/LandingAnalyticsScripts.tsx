import Script from "next/script";

function safeToken(id: string): string | null {
  const t = id.trim();
  if (!t || !/^[a-zA-Z0-9_-]+$/.test(t)) return null;
  return t;
}

type Props = {
  facebookPixelId: string;
  googleAnalyticsId: string;
};

/** Third-party tags — IDs come from DB (admin); sanitize before inject. */
export function LandingAnalyticsScripts({ facebookPixelId, googleAnalyticsId }: Props) {
  const fb = safeToken(facebookPixelId);
  const ga = safeToken(googleAnalyticsId);

  return (
    <>
      {fb ? (
        <>
          <Script id="fb-pixel-base" strategy="afterInteractive">
            {`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${fb}');
fbq('track','PageView');
            `}
          </Script>
          <noscript>
            {/* Pixel fallback — must be raw img for noscript clients */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(fb)}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
      {ga ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config','${ga}');
            `}
          </Script>
        </>
      ) : null}
    </>
  );
}
