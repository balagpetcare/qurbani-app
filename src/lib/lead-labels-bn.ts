import type { LeadStatus } from "@/generated/prisma/enums";

export const LEAD_STATUS_LABEL_BN: Record<LeadStatus, string> = {
  NEW: "নতুন",
  ASSIGNED: "নির্ধারিত",
  ACCEPTED: "গৃহীত",
  IN_PROGRESS: "চলমান",
  OBSERVED: "পর্যবেক্ষণ",
  COMPLETED: "সম্পন্ন",
  FOLLOW_UP_NEEDED: "ফলোআপ প্রয়োজন",
  CANCELLED: "বাতিল",
  REFERRED: "রেফার্ড",
};

export function leadStatusLabelBn(status: LeadStatus): string {
  return LEAD_STATUS_LABEL_BN[status] ?? status;
}
