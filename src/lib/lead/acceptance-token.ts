import { randomBytes } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";

const TOKEN_BYTES = 27;

export function newLeadAcceptanceToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function ensureLeadAcceptanceToken(
  db: Pick<PrismaClient, "lead">,
  leadId: number,
): Promise<string> {
  const existing = await db.lead.findUnique({
    where: { id: leadId },
    select: { acceptanceToken: true },
  });
  if (existing?.acceptanceToken) return existing.acceptanceToken;

  for (let i = 0; i < 14; i++) {
    const token = newLeadAcceptanceToken();
    const res = await db.lead.updateMany({
      where: { id: leadId, acceptanceToken: null },
      data: { acceptanceToken: token },
    });
    if (res.count > 0) return token;
    const again = await db.lead.findUnique({
      where: { id: leadId },
      select: { acceptanceToken: true },
    });
    if (again?.acceptanceToken) return again.acceptanceToken;
  }
  throw new Error("Failed to allocate acceptance token");
}
