-- Area management: zones, labels, popularity; optional Lead.areaId for custom areas.

CREATE TYPE "ServiceAreaZone" AS ENUM (
  'NORTH_DHAKA',
  'CENTRAL_DHAKA',
  'OLD_DHAKA',
  'SOUTH_DHAKA',
  'WEST_DHAKA',
  'OUTSIDE_DHAKA'
);

ALTER TABLE "Area" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Area" ADD COLUMN "zone" "ServiceAreaZone";
ALTER TABLE "Area" ADD COLUMN "isPopular" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Area" ADD COLUMN "note" TEXT;

CREATE INDEX "Area_zone_idx" ON "Area"("zone");
CREATE INDEX "Area_isActive_isPopular_sortOrder_idx" ON "Area"("isActive", "isPopular", "sortOrder");

ALTER TABLE "Lead" ALTER COLUMN "areaId" DROP NOT NULL;
