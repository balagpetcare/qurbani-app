import type { AnimalKind, ServiceAreaZone } from "@/generated/prisma/enums";

import { serviceAreaZoneToBn } from "@/lib/service-area-zone-bn";

type AreaPick = {
  zone: ServiceAreaZone | null;
  nameBn: string | null;
  name: string;
};

/**
 * Public-safe coarse area label. Does **not** use free-text `Lead.area` or `Lead.address`
 * (may contain street-level PII).
 */
export function computePublicCaseAreaBucket(selectedArea: AreaPick | null | undefined): string {
  if (selectedArea?.zone) {
    return serviceAreaZoneToBn(selectedArea.zone);
  }
  const bn = selectedArea?.nameBn?.trim();
  if (bn) return bn;
  const n = selectedArea?.name?.trim();
  if (n) return n;
  return "এলাকা: নির্দিষ্ট নয় (বিস্তারিত গোপন)";
}

export function animalKindPublicLabel(kind: AnimalKind | null | undefined): string | null {
  if (!kind) return null;
  const map: Record<AnimalKind, string> = {
    CATTLE: "গরু",
    GOAT: "ছাগল",
    SHEEP: "ভেড়া",
    BUFFALO: "মহিষ",
    OTHER: "অন্যান্য প্রাণী",
  };
  return map[kind] ?? null;
}
