import type { LeadStatus } from "@/generated/prisma/enums";
import { LeadStatus as LeadStatusEnum } from "@/generated/prisma/enums";

/**
 * When lead status becomes COMPLETED, stamp [leadCompletedAt] once (first completion only).
 */
export function leadCompletedAtForStatusTransition(
  previousStatus: LeadStatus,
  nextStatus: LeadStatus,
  existingLeadCompletedAt: Date | null,
): Date | undefined {
  if (existingLeadCompletedAt != null) return undefined;
  if (
    nextStatus === LeadStatusEnum.COMPLETED &&
    previousStatus !== LeadStatusEnum.COMPLETED
  ) {
    return new Date();
  }
  return undefined;
}
