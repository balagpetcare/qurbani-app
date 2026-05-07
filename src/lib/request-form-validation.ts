import { normalizeBangladeshPhone } from "@/lib/phone";

export type RequestFormField =
  | "customerName"
  | "phone"
  | "whatsapp"
  | "areaId"
  | "customArea"
  | "animalKind"
  | "animalTypeOther"
  | "problemSummary";

/** DOM ids used on /request for scroll + focus */
export const REQUEST_FIELD_IDS: Record<RequestFormField, string> = {
  customerName: "request-customerName",
  phone: "request-phone",
  whatsapp: "request-whatsapp",
  areaId: "request-area",
  customArea: "request-customArea",
  animalKind: "request-animalKind",
  animalTypeOther: "request-animalTypeOther",
  problemSummary: "request-problemSummary",
};

/** Same order used for “scroll to first error” on client and server-mapped errors */
export const REQUEST_FIELD_ORDER: RequestFormField[] = [
  "customerName",
  "phone",
  "whatsapp",
  "areaId",
  "customArea",
  "animalKind",
  "animalTypeOther",
  "problemSummary",
];

export const MSG = {
  nameRequired: "নাম লিখুন।",
  nameTooLong: "নাম খুব লম্বা — ছোট করে লিখুন।",
  phoneRequired: "মোবাইল নম্বর দিন।",
  phoneInvalid: "সঠিক বাংলাদেশি মোবাইল নম্বর দিন।",
  whatsappInvalid: "নম্বরটি সঠিক নয়। খালি রাখুন বা ঠিক করে লিখুন।",
  areaRequired: "অনুগ্রহ করে আপনার এলাকা নির্বাচন করুন।",
  customAreaRequired:
    "আপনার এলাকা তালিকায় না থাকলে ‘অন্যান্য’ নির্বাচন করে এলাকার নাম লিখুন।",
  animalRequired: "পশুর ধরন বেছে নিন।",
  animalOtherRequired: "কী পশু তা এক লাইনে লিখুন।",
  problemRequired: "সমস্যাটা সংক্ষেপে লিখুন।",
} as const;

const NAME_MAX = 200;

export type AreaPickMode = "list" | "other";

export type RequestFormValues = {
  customerName: string;
  phone: string;
  whatsapp: string;
  areaMode: AreaPickMode;
  areaId: number | "";
  customArea: string;
  animalKind: string;
  animalTypeOther: string;
  problemSummary: string;
};

export function validateRequestForm(
  v: RequestFormValues,
  allowedAreaIds: Set<number>,
): { errors: Partial<Record<RequestFormField, string>>; firstInvalid?: RequestFormField } {
  const errors: Partial<Record<RequestFormField, string>> = {};

  const name = v.customerName.trim();
  if (!name) {
    errors.customerName = MSG.nameRequired;
  } else if (name.length > NAME_MAX) {
    errors.customerName = MSG.nameTooLong;
  }

  const phoneTrim = v.phone.trim();
  if (!phoneTrim) {
    errors.phone = MSG.phoneRequired;
  } else if (!normalizeBangladeshPhone(phoneTrim)) {
    errors.phone = MSG.phoneInvalid;
  }

  const waTrim = v.whatsapp.trim();
  if (waTrim && !normalizeBangladeshPhone(waTrim)) {
    errors.whatsapp = MSG.whatsappInvalid;
  }

  if (v.areaMode === "list") {
    if (v.areaId === "" || !allowedAreaIds.has(v.areaId)) {
      errors.areaId = MSG.areaRequired;
    }
  } else {
    const custom = v.customArea.trim();
    if (custom.length < 2) {
      errors.customArea = MSG.customAreaRequired;
    }
  }

  const ak = v.animalKind.trim();
  if (!ak) {
    errors.animalKind = MSG.animalRequired;
  }

  if (ak === "OTHER") {
    if (!v.animalTypeOther.trim()) {
      errors.animalTypeOther = MSG.animalOtherRequired;
    }
  }

  if (!v.problemSummary.trim()) {
    errors.problemSummary = MSG.problemRequired;
  }

  let firstInvalid: RequestFormField | undefined;
  for (const key of REQUEST_FIELD_ORDER) {
    if (errors[key]) {
      firstInvalid = key;
      break;
    }
  }

  return { errors, firstInvalid };
}

export function focusRequestField(field: RequestFormField): void {
  const id = REQUEST_FIELD_IDS[field];
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (el instanceof HTMLElement) {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }
  });
}
