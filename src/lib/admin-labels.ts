import type { LeadPriority, LeadStatus } from "@/generated/prisma/enums";

/** Short Bengali labels for lead status (admin UI). */
export const LEAD_STATUS_LABEL_BN: Record<LeadStatus, string> = {
  NEW: "নতুন",
  ASSIGNED: "অ্যাসাইন",
  ACCEPTED: "গ্রহণ",
  IN_PROGRESS: "চলমান",
  OBSERVED: "পর্যবেক্ষণ",
  COMPLETED: "সম্পন্ন",
  FOLLOW_UP_NEEDED: "ফলোআপ প্রয়োজন",
  CANCELLED: "বাতিল",
  REFERRED: "রেফার",
};

/** Bengali labels for lead priority (filters, selects). */
export const LEAD_PRIORITY_LABEL_BN: Record<LeadPriority, string> = {
  NORMAL: "সাধারণ",
  URGENT: "জরুরি",
  EMERGENCY: "ইমার্জেন্সি",
};

export function leadPriorityLabelBn(priority: LeadPriority): string {
  return LEAD_PRIORITY_LABEL_BN[priority] ?? priority;
}
