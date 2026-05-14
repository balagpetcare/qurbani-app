/**
 * BulkSMSBD HTTP surface — thin re-exports so `lib/sms` owns the integration story.
 */
export { postBulkSmsApi, extractResponseCodeFromBody, mapBulkSmsResponseCode } from "@/lib/server/sms/bulksmsbd";
export { getSmsPostUrl, getSmsApiKey, getSmsSenderId } from "@/lib/server/sms/sms-env";
