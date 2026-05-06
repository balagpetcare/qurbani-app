"use client";

import type { LucideIcon } from "lucide-react";
import { ClipboardList, Home, LayoutDashboard } from "lucide-react";

import type { DoctorBackPreset } from "./doctor-back-preset";

/** Consistent stroke icons for doctor chrome (header, drawer, pills). */
export const doctorHeaderIconClass = "size-[18px] shrink-0 opacity-[0.92]";

const backMap: Record<DoctorBackPreset, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  leads: ClipboardList,
};

export function DoctorBackIcon({ preset }: { preset: DoctorBackPreset }) {
  const Cmp = backMap[preset];
  return <Cmp className={doctorHeaderIconClass} aria-hidden />;
}
