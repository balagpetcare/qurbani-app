import type { ReactNode } from "react";

import type { DoctorBackPreset } from "./doctor-back-preset";
import { DoctorPortalChrome } from "./DoctorPortalChrome";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  backPreset?: DoctorBackPreset;
  children: ReactNode;
};

/** Logged-in doctor shell: gradient header, desktop links, mobile drawer + bottom nav. */
export function DoctorLeadsNav({
  title,
  subtitle,
  backHref,
  backLabel,
  backPreset,
  children,
}: Props) {
  return (
    <DoctorPortalChrome
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel={backLabel}
      backPreset={backPreset}
    >
      {children}
    </DoctorPortalChrome>
  );
}
