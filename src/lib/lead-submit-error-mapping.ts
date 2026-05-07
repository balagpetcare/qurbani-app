import type { RequestFormField } from "@/lib/request-form-validation";
import { MSG } from "@/lib/request-form-validation";
import { BD_PHONE_INVALID_MSG_BN, BD_WHATSAPP_INVALID_MSG_BN } from "@/lib/phone";

/** Maps API `error` codes to inline fields when possible. */
export function mapLeadApiErrorToFields(
  errorCode: string | undefined,
): Partial<Record<RequestFormField, string>> {
  const out: Partial<Record<RequestFormField, string>> = {};
  if (!errorCode) return out;

  switch (errorCode) {
    case "customerName and phone are required":
      out.customerName = MSG.nameRequired;
      out.phone = MSG.phoneRequired;
      break;
    case "areaId is required":
    case "AREA_SELECTION_REQUIRED":
      out.areaId = MSG.areaRequired;
      break;
    case "CUSTOM_AREA_REQUIRED":
      out.customArea = MSG.customAreaRequired;
      break;
    case "AREA_AMBIGUOUS":
      out.areaId = MSG.areaRequired;
      out.customArea = MSG.customAreaRequired;
      break;
    case "serviceRequirement is required":
      out.problemSummary = MSG.problemRequired;
      break;
    case "animalKind is required":
    case "ANIMAL_KIND_REQUIRED":
      out.animalKind = MSG.animalRequired;
      break;
    case BD_PHONE_INVALID_MSG_BN:
    case "Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).":
      out.phone = BD_PHONE_INVALID_MSG_BN;
      break;
    case BD_WHATSAPP_INVALID_MSG_BN:
      out.whatsapp = BD_WHATSAPP_INVALID_MSG_BN;
      break;
    case "animalKind OTHER হলে অন্যান্য পশুর বর্ণনা (animalTypeOther) আবশ্যক।":
      out.animalTypeOther = MSG.animalOtherRequired;
      break;
    case "Invalid or inactive areaId":
      out.areaId = "এই এলাকাটি এখন নেই। অন্য এলাকা বেছে নিন।";
      break;
    default:
      break;
  }

  return out;
}

/**
 * Message shown when errors cannot be tied to a single field.
 * Prefers `messageBn`; uses `error` when it already looks Bengali (e.g. rate limit).
 */
export function resolveLeadSubmitFailureMessage(payload: {
  error?: string;
  messageBn?: string;
}): string {
  const bn = payload.messageBn?.trim();
  if (bn) return bn;

  const err = payload.error?.trim() ?? "";

  if (
    err.includes("।") ||
    err.includes("হয়েছে") ||
    err.includes("দয়া করে") ||
    err.includes("চেষ্টা")
  ) {
    return err;
  }

  switch (err) {
    case "Invalid JSON body":
      return "পেজ রিফ্রেশ করে আবার চেষ্টা করুন।";
    case "Failed to save lead":
      return "একটু পরে আবার চেষ্টা করুন।";
    case "LEAD_FORM_DISABLED":
      return "অনলাইন ফর্ম এখন বন্ধ। কল বা WhatsApp করুন।";
    case "EMERGENCY_LEADS_DISABLED":
      return "এখন জরুরির চিহ্ন চালু নেই। সাধারণভাবে জমা দিন বা কল করুন।";
    default:
      return "জমা দেওয়া যায়নি। একটু পরে আবার চেষ্টা করুন।";
  }
}
