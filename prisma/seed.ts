/**
 * Seeds the Main Admin user for database-backed admin login (see `/api/admin/login`).
 */
import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";
import { normalizeBangladeshPhone } from "../src/lib/phone";
import { SITE_SETTING_SEED_ROWS } from "../src/lib/site-setting-registry";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

const DEFAULT_ADMIN_EMAIL = "balag.bd@gmail.com";
const DEFAULT_ADMIN_PHONE = "01777889994";

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

  const areaRows = [
    {
      slug: "onnanno",
      name: "অন্যান্য / Other",
      nameBn: "অন্যান্য",
      sortOrder: 0,
    },
    { slug: "mirpur", name: "Mirpur", nameBn: "মিরপুর", sortOrder: 10 },
    { slug: "uttara", name: "Uttara", nameBn: "উত্তরা", sortOrder: 20 },
    { slug: "rampura", name: "Rampura", nameBn: "রামপুরা", sortOrder: 30 },
    { slug: "badda", name: "Badda", nameBn: "বাড্ডা", sortOrder: 40 },
    { slug: "gulshan", name: "Gulshan", nameBn: "গুলশান", sortOrder: 50 },
    { slug: "banani", name: "Banani", nameBn: "বনানী", sortOrder: 60 },
    {
      slug: "mohammadpur",
      name: "Mohammadpur",
      nameBn: "মোহাম্মদপুর",
      sortOrder: 70,
    },
    {
      slug: "jatrabari",
      name: "Jatrabari",
      nameBn: "যাত্রাবাড়ী",
      sortOrder: 80,
    },
    {
      slug: "keraniganj",
      name: "Keraniganj",
      nameBn: "কেরানীগঞ্জ",
      sortOrder: 90,
    },
    {
      slug: "savar-nearby",
      name: "Savar & nearby",
      nameBn: "সাভার ও আশেপাশে",
      sortOrder: 100,
    },
  ];

  for (const a of areaRows) {
    await prisma.area.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        name: a.name,
        nameBn: a.nameBn,
        sortOrder: a.sortOrder,
        isActive: true,
      },
      update: {
        name: a.name,
        nameBn: a.nameBn,
        sortOrder: a.sortOrder,
        isActive: true,
      },
    });
  }

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

  console.log(
    `Seed OK: Main Admin id=${admin.id} email=${admin.email} (login with this email/phone + ADMIN_SEED_PASSWORD). Areas upserted: ${areaRows.length}. Site settings upserted: ${SITE_SETTING_SEED_ROWS.length}.`,
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
