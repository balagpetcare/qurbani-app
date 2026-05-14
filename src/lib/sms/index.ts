export {
  normalizeBangladeshPhone,
  type NormalizedBd880,
} from "@/lib/sms/normalize";
export {
  buildLeadIntakeCustomerConfirmationSms,
  buildOfficeLeadAlertSms,
  buildLeadIntakeOfficeSms,
  CUSTOMER_LEAD_CONFIRMATION_EN,
} from "@/lib/sms/templates";
export {
  safeSendSms,
  sendCustomerLeadConfirmation,
  sendOfficeLeadAlert,
  type SafeSendSmsInput,
} from "@/lib/sms/send";
export * from "@/lib/sms/logger";
export * from "@/lib/sms/provider";
