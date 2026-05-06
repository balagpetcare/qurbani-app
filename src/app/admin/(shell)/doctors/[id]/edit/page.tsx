import Link from "next/link";
import { notFound } from "next/navigation";

import { DoctorEditForm } from "@/components/admin/DoctorEditForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { UserRole } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditDoctorPage({ params }: PageProps) {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) notFound();

  const [doctor, areas] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: UserRole.DOCTOR },
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        email: true,
        notes: true,
        qualification: true,
        experienceSummary: true,
        shortBio: true,
        availableTimeText: true,
        availabilityStatus: true,
        profilePhotoUrl: true,
        homeVisitFeeMin: true,
        homeVisitFeeMax: true,
        feeNote: true,
        notifyEmail: true,
        notifySms: true,
        notifyWhatsApp: true,
        isActive: true,
        emergencyAvailable: true,
        createdAt: true,
        doctorAreas: { select: { areaId: true } },
      },
    }),
    prisma.area.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameBn: true },
    }),
  ]);

  if (!doctor || !doctor.phone) notFound();

  return (
    <AdminAppShell>
      <AdminNav title="ডাক্তার সম্পাদনা" narrow subtitle={doctor.name} />

      <AdminMain variant="narrow" className="space-y-8">
        <p className="text-sm text-zinc-600">
          তৈরি: {formatDateTime(doctor.createdAt)} ·{" "}
          <Link href="/admin/doctors" className="font-medium text-emerald-700 hover:underline">
            তালিকায় ফিরুন
          </Link>
        </p>

        <DoctorEditForm
          key={`${doctor.id}-${doctor.doctorAreas.map((x) => x.areaId).sort((a, b) => a - b).join(",")}`}
          doctorId={doctor.id}
          areas={areas}
          initial={{
            name: doctor.name,
            phone: doctor.phone,
            whatsapp: doctor.whatsapp,
            email: doctor.email,
            notes: doctor.notes,
            qualification: doctor.qualification,
            experienceSummary: doctor.experienceSummary,
            shortBio: doctor.shortBio,
            availableTimeText: doctor.availableTimeText,
            availabilityStatus: doctor.availabilityStatus,
            profilePhotoUrl: doctor.profilePhotoUrl,
            homeVisitFeeMin: doctor.homeVisitFeeMin,
            homeVisitFeeMax: doctor.homeVisitFeeMax,
            feeNote: doctor.feeNote,
            notifyEmail: doctor.notifyEmail,
            notifySms: doctor.notifySms,
            notifyWhatsApp: doctor.notifyWhatsApp,
            isActive: doctor.isActive,
            emergencyAvailable: doctor.emergencyAvailable,
            areaIds: doctor.doctorAreas.map((x) => x.areaId),
          }}
        />
      </AdminMain>
    </AdminAppShell>
  );
}
