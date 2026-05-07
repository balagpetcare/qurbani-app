import type { Prisma } from "@/generated/prisma/client";

import { LEGACY_AREA_SLUGS_EXCLUDED_FROM_PUBLIC } from "@/lib/area-seed-data";

/** Active areas shown on public pickers (`/request`, doctor apply, `/api/areas`). */
export const publicCustomerAreaWhere: Prisma.AreaWhereInput = {
  isActive: true,
  slug: { notIn: [...LEGACY_AREA_SLUGS_EXCLUDED_FROM_PUBLIC] },
};

export const publicCustomerAreaOrderBy: Prisma.AreaOrderByWithRelationInput[] = [
  { isPopular: "desc" },
  { sortOrder: "asc" },
  { nameBn: "asc" },
  { name: "asc" },
];
