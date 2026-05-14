import type { PublicDoctorAnimalFocusSlug, PublicDoctorCard } from "@/lib/public-doctor";

export type HomeDoctorFilterState = {
  areaId: number | "";
  animalSlug: PublicDoctorAnimalFocusSlug | "";
  fastResponseOnly: boolean;
  activePanelOnly: boolean;
};

export const HOME_DOCTOR_INITIAL_VISIBLE = 6;
export const HOME_DOCTOR_PAGE_SIZE = 6;

export function applyHomeDoctorFilters(
  doctors: PublicDoctorCard[],
  filters: HomeDoctorFilterState,
): PublicDoctorCard[] {
  return doctors.filter((d) => {
    const code = (d.availabilityStatusCode ?? "").trim().toUpperCase();

    if (filters.areaId !== "") {
      const ids = d.serviceAreaIds ?? [];
      if (!ids.includes(filters.areaId)) return false;
    }

    if (filters.animalSlug !== "") {
      const tags = d.animalFocusSlugs ?? [];
      if (!tags.includes(filters.animalSlug)) return false;
    }

    if (filters.fastResponseOnly && code !== "AVAILABLE") {
      return false;
    }

    if (filters.activePanelOnly && code === "OFF") {
      return false;
    }

    return true;
  });
}

export function homeDoctorFiltersActive(f: HomeDoctorFilterState): boolean {
  return (
    f.areaId !== "" ||
    f.animalSlug !== "" ||
    f.fastResponseOnly ||
    f.activePanelOnly
  );
}
