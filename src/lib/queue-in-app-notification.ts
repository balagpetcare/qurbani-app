import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "@/generated/prisma/enums";
import {
  getAdminInAppNotificationsEnabled,
  getDoctorInAppNotificationsEnabled,
} from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

const ADMIN_QUEUE_TYPES = new Set<NotificationType>([
  NotificationType.DOCTOR_APPLICATION,
  NotificationType.DOCTOR_APPLICATION_REVIEWED,
]);

const DOCTOR_QUEUE_TYPES = new Set<NotificationType>([
  NotificationType.DOCTOR_ASSIGNED,
  NotificationType.CASE_ACCEPTED_BY_DOCTOR,
  NotificationType.STATUS_CHANGED,
  NotificationType.FOLLOW_UP,
]);

/** Best-effort in-app queue row for admin dashboard; never throws to callers. */
export async function queueInAppNotification(input: {
  type: NotificationType;
  message: string;
  leadId?: number | null;
}): Promise<void> {
  try {
    if (ADMIN_QUEUE_TYPES.has(input.type)) {
      if (!(await getAdminInAppNotificationsEnabled())) return;
    } else if (DOCTOR_QUEUE_TYPES.has(input.type)) {
      if (!(await getDoctorInAppNotificationsEnabled())) return;
    }

    await prisma.notification.create({
      data: {
        type: input.type,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.PENDING,
        message: input.message,
        leadId: input.leadId ?? undefined,
      },
    });
  } catch (err) {
    console.error("queueInAppNotification", err);
  }
}
