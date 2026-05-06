import { redirect } from "next/navigation";

import { DoctorLeadsNav } from "@/components/doctor/DoctorLeadsNav";
import { DoctorSettingsForm } from "@/components/doctor/DoctorSettingsForm";
import { getLoggedInDoctor } from "@/lib/doctor-server-session";

export const dynamic = "force-dynamic";

export default async function DoctorSettingsPage() {
  const doctor = await getLoggedInDoctor();
  if (!doctor) {
    redirect("/doctor/login?from=/doctor/settings");
  }

  return (
    <DoctorLeadsNav
      title="সেটিংস"
      subtitle="প্রোফাইল ও পছন্দ · কুরবানি ২০২৬"
      backHref="/doctor"
      backLabel="ড্যাশবোর্ড"
      backPreset="dashboard"
    >
      <DoctorSettingsForm initialDoctor={doctor} />
    </DoctorLeadsNav>
  );
}
