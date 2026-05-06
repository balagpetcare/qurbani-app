import type { AnimalKind } from "@/generated/prisma/enums";
import { AnimalKind as AnimalKindEnum } from "@/generated/prisma/enums";

import { problemCategoryLabelBn } from "@/lib/lead-problem-categories";

const ANIMAL_BN: Record<AnimalKind, string> = {
  [AnimalKindEnum.CATTLE]: "গরু",
  [AnimalKindEnum.GOAT]: "ছাগল",
  [AnimalKindEnum.SHEEP]: "ভেড়া",
  [AnimalKindEnum.BUFFALO]: "মহিষ",
  [AnimalKindEnum.OTHER]: "অন্যান্য",
};

export function formatAnimalKindBn(kind: AnimalKind | null | undefined): string {
  if (!kind) return "—";
  return ANIMAL_BN[kind] ?? kind;
}

/** Prefer enum label; fall back to legacy `animalType` text. */
export function formatLeadAnimalDisplay(
  animalKind: AnimalKind | null | undefined,
  animalType: string | null | undefined,
): string {
  if (animalKind) {
    const base = formatAnimalKindBn(animalKind);
    if (animalKind === AnimalKindEnum.OTHER && animalType?.trim()) {
      return `${base} (${animalType.trim()})`;
    }
    return base;
  }
  return animalType?.trim() || "—";
}

export function formatLeadProblemCategory(
  slug: string | null | undefined,
): string {
  return problemCategoryLabelBn(slug);
}
