export type SmsPurpose =
  | "otp"
  | "lead_tracking"
  | "doctor_new_lead"
  | "admin_new_lead"
  | "customer_status"
  | "customer_accepted"
  | "lead_office_intake"
  | "lead_customer_intake_confirm";

export const SMS_PURPOSE = {
  OTP: "otp",
  LEAD_TRACKING: "lead_tracking",
  DOCTOR_NEW_LEAD: "doctor_new_lead",
  ADMIN_NEW_LEAD: "admin_new_lead",
  CUSTOMER_STATUS: "customer_status",
  CUSTOMER_ACCEPTED: "customer_accepted",
  LEAD_OFFICE_INTAKE: "lead_office_intake",
  LEAD_CUSTOMER_INTAKE_CONFIRM: "lead_customer_intake_confirm",
} as const satisfies Record<string, SmsPurpose>;

export type SendSmsSafeResult =
  | {
      ok: true;
      status: "sent" | "skipped";
      providerCode?: string;
      dryRun?: boolean;
      internal?: string;
    }
  | {
      ok: false;
      status: "failed" | "skipped";
      code: string;
      message: string;
      providerCode?: string;
      internal?: string;
    };
