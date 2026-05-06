import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { requireMainAdminFromRequest } from "@/lib/auth-guards";
import { normalizeBdContactSettingDigits } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import {
  ALL_SITE_SETTING_KEYS,
  SITE_SETTING_KEYS,
  SITE_SETTING_SEED_ROWS,
} from "@/lib/site-setting-registry";
import {
  coerceSettingValue,
  loadMergedSiteSettingsForAdmin,
} from "@/lib/site-settings";

export async function GET(request: Request) {
  const auth = await requireMainAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const merged = await loadMergedSiteSettingsForAdmin();
    return NextResponse.json({ settings: merged });
  } catch (err) {
    console.error("GET /api/admin/settings", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireMainAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updatesRaw =
    body &&
    typeof body === "object" &&
    "updates" in body &&
    body.updates &&
    typeof body.updates === "object"
      ? (body.updates as Record<string, unknown>)
      : null;

  if (!updatesRaw || Object.keys(updatesRaw).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const ops: {
    key: string;
    coerced: NonNullable<ReturnType<typeof coerceSettingValue>>;
  }[] = [];
  for (const [key, raw] of Object.entries(updatesRaw)) {
    if (!ALL_SITE_SETTING_KEYS.includes(key)) {
      return NextResponse.json({ error: `Unknown key: ${key}` }, { status: 400 });
    }
    const coerced = coerceSettingValue(key, raw);
    if (coerced === null) {
      return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
    }
    ops.push({ key, coerced });
  }

  const digitKeys = new Set<string>([
    SITE_SETTING_KEYS.CONTACT_PHONE_CALL,
    SITE_SETTING_KEYS.CONTACT_WHATSAPP,
    SITE_SETTING_KEYS.CONTACT_EMERGENCY,
  ]);
  for (const op of ops) {
    if (digitKeys.has(op.key) && typeof op.coerced === "string") {
      op.coerced = normalizeBdContactSettingDigits(op.coerced);
    }
  }

  const meta = new Map(SITE_SETTING_SEED_ROWS.map((r) => [r.key, r]));

  try {
    await prisma.$transaction(
      ops.map(({ key, coerced }) => {
        const m = meta.get(key)!;
        return prisma.siteSetting.upsert({
          where: { key },
          create: {
            key,
            value: coerced as Prisma.InputJsonValue,
            group: m.group,
            label: m.label,
            description: m.description ?? null,
            isPublic: m.isPublic,
          },
          update: { value: coerced as Prisma.InputJsonValue },
        });
      }),
    );

    revalidatePath("/");
    revalidatePath("/thank-you");
    revalidatePath("/doctor/apply");
    revalidatePath("/admin/settings");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin/settings", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
