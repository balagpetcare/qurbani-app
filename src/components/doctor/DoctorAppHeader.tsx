"use client";

import type { ComponentProps } from "react";

import { AppHeader } from "@/components/ui/AppHeader";

import type { DoctorBackPreset } from "./doctor-back-preset";
import { DoctorBackIcon } from "./doctor-header-icons";

export type DoctorAppHeaderProps = Omit<
  ComponentProps<typeof AppHeader>,
  "backLeadingIcon" | "stackedTitleRow"
> & {
  backPreset?: DoctorBackPreset;
};

/** Doctor-facing AppHeader: safe-area stack layout + optional Lucide back icon. */
export function DoctorAppHeader({ backPreset, ...rest }: DoctorAppHeaderProps) {
  return (
    <AppHeader
      {...rest}
      stackedTitleRow
      backLeadingIcon={backPreset ? <DoctorBackIcon preset={backPreset} /> : undefined}
    />
  );
}
