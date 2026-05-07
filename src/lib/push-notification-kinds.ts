/**
 * Future FCM `data.type` values (server → device). No sends are implemented yet;
 * keep payloads small and PII-free.
 */
export const PushNotificationKind = {
  /** Doctor: new lead assigned or pool (product choice). */
  DOCTOR_NEW_LEAD: "DOCTOR_NEW_LEAD",
  /** Customer: status / assignment update for their lead. */
  CUSTOMER_LEAD_UPDATE: "CUSTOMER_LEAD_UPDATE",
  /** Customer or doctor: case closed / billing snapshot id. */
  TREATMENT_COMPLETED: "TREATMENT_COMPLETED",
  /** Future moderation queue outcome. */
  MODERATION_RESULT: "MODERATION_RESULT",
} as const;

export type PushNotificationKindType =
  (typeof PushNotificationKind)[keyof typeof PushNotificationKind];
