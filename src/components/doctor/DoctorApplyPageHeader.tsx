"use client";

import { DoctorAppHeader } from "./DoctorAppHeader";

export function DoctorApplyPageHeader() {
  return (
    <DoctorAppHeader
      title="ডাক্তার আবেদন"
      subtitle="কুরবানি ২০২৬ · যোগ দিন"
      backHref="/"
      backLabel="হোম"
      backPreset="home"
      variant="gradient"
    />
  );
}
