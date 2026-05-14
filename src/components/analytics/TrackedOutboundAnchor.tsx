"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

import { trackPhoneCallClick, trackWhatsAppClick } from "@/lib/analytics/googleAds";

export type TrackedOutboundKind = "tel" | "whatsapp";

export type TrackedOutboundAnchorProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "onClick"
> & {
  href: string;
  tracking: TrackedOutboundKind;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Same as a plain `<a>`, but fires Google Ads click conversions for phone vs WhatsApp when configured.
 */
export function TrackedOutboundAnchor({
  href,
  tracking,
  onClick,
  ...rest
}: TrackedOutboundAnchorProps) {
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        if (tracking === "tel") trackPhoneCallClick();
        else trackWhatsAppClick();
        onClick?.(e);
      }}
    />
  );
}
