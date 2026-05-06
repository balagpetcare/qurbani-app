import type { Prisma } from "@/generated/prisma/client";
import type { LeadStatus } from "@/generated/prisma/enums";
import { LeadStatus as LeadStatusEnum } from "@/generated/prisma/enums";

export type StatusActorKind = "ADMIN" | "DOCTOR" | "SYSTEM";

export async function appendLeadStatusHistory(
  tx: Prisma.TransactionClient,
  params: {
    leadId: number;
    fromStatus: LeadStatus | null;
    toStatus: LeadStatus;
    actorKind: StatusActorKind;
    actorUserId?: number | null;
    note?: string | null;
  },
) {
  await tx.leadStatusHistory.create({
    data: {
      leadId: params.leadId,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus,
      actorKind: params.actorKind,
      actorUserId: params.actorUserId ?? null,
      note: params.note ?? null,
    },
  });
}

const TERMINAL: LeadStatus[] = [
  LeadStatusEnum.COMPLETED,
  LeadStatusEnum.FOLLOW_UP_NEEDED,
  LeadStatusEnum.CANCELLED,
  LeadStatusEnum.REFERRED,
];

export function isLeadStatusTerminal(status: LeadStatus): boolean {
  return TERMINAL.includes(status);
}

/** Doctor may set via /status only (not accept/start/complete). */
export function doctorQuickStatusTargets(from: LeadStatus): LeadStatus[] {
  switch (from) {
    case LeadStatusEnum.IN_PROGRESS:
      return [
        LeadStatusEnum.OBSERVED,
        LeadStatusEnum.CANCELLED,
        LeadStatusEnum.REFERRED,
      ];
    case LeadStatusEnum.OBSERVED:
      return [
        LeadStatusEnum.IN_PROGRESS,
        LeadStatusEnum.CANCELLED,
        LeadStatusEnum.REFERRED,
      ];
    case LeadStatusEnum.ACCEPTED:
    case LeadStatusEnum.ASSIGNED:
      return [LeadStatusEnum.CANCELLED, LeadStatusEnum.REFERRED];
    default:
      return [];
  }
}

export function parseMediaUrlList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const x of parsed) {
      if (typeof x === "string") {
        const u = x.trim();
        if (
          u &&
          (u.startsWith("https://") ||
            u.startsWith("http://") ||
            u.startsWith("/"))
        ) {
          out.push(u);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}
