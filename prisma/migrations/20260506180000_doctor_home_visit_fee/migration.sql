-- Home visit fee range for public doctor cards (BDT whole taka, admin-editable).
ALTER TABLE "User" ADD COLUMN "homeVisitFeeMin" INTEGER;
ALTER TABLE "User" ADD COLUMN "homeVisitFeeMax" INTEGER;
ALTER TABLE "User" ADD COLUMN "feeNote" TEXT;
