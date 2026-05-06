import type { NotificationChannel } from "@/generated/prisma/enums";

import { getNotificationDriver } from "@/lib/notifications/env";
import {
  sendSmsPlaceholder,
  sendWhatsAppPlaceholder,
  type DeliveryPayload,
} from "@/lib/delivery-channels.placeholder";

export type OutboundDispatchResult =
  | { channel: NotificationChannel; status: "queued_db_only" }
  | { channel: NotificationChannel; status: "skipped"; reason: string }
  | { channel: NotificationChannel; status: "placeholder_not_sent"; reason: string };

/**
 * Documents the path from a queued `Notification` row to real delivery.
 * Today: **no drivers** send externally; WhatsApp/SMS placeholders return NOT_IMPLEMENTED.
 *
 * Wire this after choosing a provider: branch on `getNotificationDriver(...)` and call SDK.
 */
export async function dispatchOutboundNotificationPlaceholder(input: {
  channel: NotificationChannel;
  payload: DeliveryPayload;
}): Promise<OutboundDispatchResult> {
  if (input.channel === "IN_APP") {
    return { channel: "IN_APP", status: "queued_db_only" };
  }

  if (input.channel === "WHATSAPP") {
    const driver = getNotificationDriver("WHATSAPP");
    if (driver === "none") {
      await sendWhatsAppPlaceholder(input.payload);
      return {
        channel: "WHATSAPP",
        status: "placeholder_not_sent",
        reason: "QURBANI_NOTIFICATION_WHATSAPP_DRIVER=none",
      };
    }
    return {
      channel: "WHATSAPP",
      status: "skipped",
      reason: `driver_${driver}_not_wired_in_code`,
    };
  }

  if (input.channel === "SMS") {
    const driver = getNotificationDriver("SMS");
    if (driver === "none") {
      await sendSmsPlaceholder(input.payload);
      return {
        channel: "SMS",
        status: "placeholder_not_sent",
        reason: "QURBANI_NOTIFICATION_SMS_DRIVER=none",
      };
    }
    return {
      channel: "SMS",
      status: "skipped",
      reason: `driver_${driver}_not_wired_in_code`,
    };
  }

  if (input.channel === "EMAIL") {
    const driver = getNotificationDriver("EMAIL");
    return {
      channel: "EMAIL",
      status: "skipped",
      reason:
        driver === "none"
          ? "QURBANI_NOTIFICATION_EMAIL_DRIVER=none"
          : `driver_${driver}_not_wired_in_code`,
    };
  }

  return {
    channel: input.channel,
    status: "skipped",
    reason: "unknown_channel",
  };
}
