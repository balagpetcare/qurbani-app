/**
 * Seeds the Main Admin user for database-backed admin login (see `/api/admin/login`).
 */
import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";
import { normalizeBangladeshPhone } from "../src/lib/phone";
import { AREA_SEED_ROWS } from "../src/lib/area-seed-data";
import { SITE_SETTING_SEED_ROWS } from "../src/lib/site-setting-registry";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

/** Defaults only when ADMIN_SEED_EMAIL / ADMIN_SEED_PHONE are unset — override in `.env` for real deploys. */
const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_PHONE = "01999999999";

async function main() {
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!password || !password.trim()) {
    throw new Error(
      "ADMIN_SEED_PASSWORD is required. Set it in .env before running the seed (see .env.example).",
    );
  }

  const email =
    (process.env.ADMIN_SEED_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL).toLowerCase();
  const phoneRaw = process.env.ADMIN_SEED_PHONE?.trim() || DEFAULT_ADMIN_PHONE;
  const phoneNorm = normalizeBangladeshPhone(phoneRaw);
  if (!phoneNorm) {
    throw new Error(
      `ADMIN_SEED_PHONE must be a valid Bangladesh mobile (got "${phoneRaw}").`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      name: "Main Admin",
      email,
      phone: phoneNorm,
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash,
    },
    update: {
      name: "Main Admin",
      email,
      phone: phoneNorm,
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash,
    },
  });

  await prisma.area.upsert({
    where: { slug: "onnanno" },
    create: {
      slug: "onnanno",
      name: "Legacy other",
      nameBn: "অন্যান্য (পুরনো)",
      sortOrder: 9999,
      isActive: false,
    },
    update: {
      isActive: false,
    },
  });

  for (const a of AREA_SEED_ROWS) {
    await prisma.area.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        name: a.name,
        nameBn: a.nameBn,
        nameEn: a.nameEn ?? null,
        zone: a.zone,
        isPopular: a.isPopular,
        sortOrder: a.sortOrder,
        isActive: a.isActive ?? true,
      },
      update: {
        name: a.name,
        nameBn: a.nameBn,
        nameEn: a.nameEn ?? null,
        zone: a.zone,
        isPopular: a.isPopular,
        sortOrder: a.sortOrder,
        isActive: a.isActive ?? true,
      },
    });
  }

  await prisma.area.updateMany({
    where: { slug: "savar-nearby" },
    data: { isActive: false },
  });

  for (const row of SITE_SETTING_SEED_ROWS) {
    await prisma.siteSetting.upsert({
      where: { key: row.key },
      create: {
        key: row.key,
        value: row.value as Prisma.InputJsonValue,
        group: row.group,
        label: row.label,
        description: row.description ?? null,
        isPublic: row.isPublic,
      },
      update: {
        label: row.label,
        group: row.group,
        description: row.description ?? null,
        isPublic: row.isPublic,
      },
    });
  }

  const doctorSeedPwd = process.env.DOCTOR_SEED_PASSWORD?.trim();
  const doctorSeedEmail = process.env.DOCTOR_SEED_EMAIL?.trim()?.toLowerCase();
  const doctorSeedPhoneRaw = process.env.DOCTOR_SEED_PHONE?.trim();
  if (doctorSeedPwd && doctorSeedEmail && doctorSeedPhoneRaw) {
    const docPhone = normalizeBangladeshPhone(doctorSeedPhoneRaw);
    if (!docPhone) {
      throw new Error(
        `DOCTOR_SEED_PHONE must be a valid Bangladesh mobile (got "${doctorSeedPhoneRaw}").`,
      );
    }
    const firstArea = await prisma.area.findFirst({
      where: { isActive: true, slug: { not: "onnanno" } },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (!firstArea) {
      console.warn("Seed: DOCTOR_SEED_* set but no active area — skipping dev doctor.");
    } else {
      const docName =
        process.env.DOCTOR_SEED_NAME?.trim() || "Dev Seed Doctor";
      const docHash = await bcrypt.hash(doctorSeedPwd, 12);
      const existingDoc = await prisma.user.findFirst({
        where: { email: doctorSeedEmail },
        select: { id: true, role: true },
      });
      if (existingDoc) {
        await prisma.user.update({
          where: { id: existingDoc.id },
          data: {
            name: docName,
            phone: docPhone,
            email: doctorSeedEmail,
            passwordHash: docHash,
            role: UserRole.DOCTOR,
            isActive: true,
          },
        });
        const hasArea = await prisma.doctorArea.count({
          where: { userId: existingDoc.id },
        });
        if (hasArea === 0) {
          await prisma.doctorArea.create({
            data: { userId: existingDoc.id, areaId: firstArea.id },
          });
        }
      } else {
        await prisma.user.create({
          data: {
            name: docName,
            phone: docPhone,
            email: doctorSeedEmail,
            passwordHash: docHash,
            role: UserRole.DOCTOR,
            isActive: true,
            doctorAreas: { create: [{ areaId: firstArea.id }] },
          },
        });
      }
      console.log(
        `Seed: dev doctor upserted for email=${doctorSeedEmail} (login with DOCTOR_SEED_PASSWORD + mobile doctor login).`,
      );
    }
  }

  console.log(
    `Seed OK: Main Admin id=${admin.id} email=${admin.email} (login with this email/phone + ADMIN_SEED_PASSWORD). Areas upserted: ${AREA_SEED_ROWS.length}. Site settings upserted: ${SITE_SETTING_SEED_ROWS.length}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
