"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { SearchableAreaSelect } from "@/components/forms/SearchableAreaSelect";
import { CustomerDialog } from "@/components/ui/CustomerDialog";
import {
  landingTelHref,
  landingWhatsAppHref,
} from "@/components/landing/landing-contact";
import { LeadPriority } from "@/generated/prisma/enums";
import {
  mapLeadApiErrorToFields,
  resolveLeadSubmitFailureMessage,
} from "@/lib/lead-submit-error-mapping";
import {
  AreaPickMode,
  focusRequestField,
  REQUEST_FIELD_IDS,
  REQUEST_FIELD_ORDER,
  RequestFormField,
  validateRequestForm,
} from "@/lib/request-form-validation";
import { utmPayloadFromSearchParams } from "@/lib/utm-from-search";

type AreaOpt = {
  id: number;
  name: string;
  nameBn: string | null;
  nameEn: string | null;
  isPopular: boolean;
};

const ANIMAL_OPTIONS: { value: string; label: string }[] = [
  { value: "CATTLE", label: "গরু" },
  { value: "GOAT", label: "ছাগল" },
  { value: "SHEEP", label: "ভেড়া" },
  { value: "BUFFALO", label: "মহিষ" },
  { value: "OTHER", label: "অন্যান্য" },
];

const ERR_ID: Record<RequestFormField, string> = {
  customerName: "request-err-customerName",
  phone: "request-err-phone",
  whatsapp: "request-err-whatsapp",
  areaId: "request-err-areaId",
  customArea: "request-err-customArea",
  animalKind: "request-err-animalKind",
  animalTypeOther: "request-err-animalTypeOther",
  problemSummary: "request-err-problemSummary",
};

function inputClass(invalid: boolean): string {
  return [
    "mt-2 w-full max-w-full rounded-xl border bg-white px-4 py-3 text-lg text-zinc-900 outline-none transition focus:ring-2 disabled:bg-zinc-100",
    invalid
      ? "border-red-500 ring-2 ring-red-200 focus:border-red-600 focus:ring-red-200"
      : "border-zinc-300 ring-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/30",
  ].join(" ");
}

function initialAreaSelection(areas: AreaOpt[], prefill?: number): number | "" {
  if (!prefill || prefill <= 0) return "";
  return areas.some((a) => a.id === prefill) ? prefill : "";
}

type Props = {
  initialAreas: AreaOpt[];
  leadFormEnabled: boolean;
  emergencyLeadEnabled: boolean;
  phoneDigits: string;
  whatsAppDigits: string;
  /** When set and present in `initialAreas`, pre-selects area (e.g. `?area=` from landing). */
  prefillAreaId?: number;
};

export function SimpleRequestForm({
  initialAreas,
  leadFormEnabled,
  emergencyLeadEnabled,
  phoneDigits,
  whatsAppDigits,
  prefillAreaId,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RequestFormField, string>>
  >({});

  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);
  const [serverDialogOpen, setServerDialogOpen] = useState(false);

  const [successLeadId, setSuccessLeadId] = useState<number | undefined>(
    undefined,
  );
  const [successTrackingCode, setSuccessTrackingCode] = useState<
    string | undefined
  >(undefined);
  const [serverMessageBn, setServerMessageBn] = useState<string>("");

  const [animalKind, setAnimalKind] = useState("");
  const [areaMode, setAreaMode] = useState<AreaPickMode>(() =>
    initialAreas.length === 0 ? "other" : "list",
  );
  const [areaId, setAreaId] = useState<number | "">(() =>
    initialAreaSelection(initialAreas, prefillAreaId),
  );
  const [customArea, setCustomArea] = useState("");

  const telHref = landingTelHref(phoneDigits);
  const waHref = landingWhatsAppHref(whatsAppDigits);
  const showOtherAnimal = animalKind === "OTHER";
  const areasUnavailable = initialAreas.length === 0;

  const popularAreas = useMemo(
    () => initialAreas.filter((a) => a.isPopular),
    [initialAreas],
  );

  const allowedAreaIds = useMemo(
    () => new Set(initialAreas.map((a) => a.id)),
    [initialAreas],
  );

  const clearFieldError = useCallback((key: RequestFormField) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setListAreaMode = useCallback(() => {
    setAreaMode("list");
    setCustomArea("");
    clearFieldError("customArea");
  }, [clearFieldError]);

  const setOtherAreaMode = useCallback(() => {
    setAreaMode("other");
    setAreaId("");
    clearFieldError("areaId");
  }, [clearFieldError]);

  const runSubmit = useCallback(async () => {
    const form = formRef.current;
    if (!form) return;

    setFieldErrors({});
    setServerMessageBn("");

    const fd = new FormData(form);

    const areaIdRaw = fd.get("areaId");
    let parsedArea: number | "" = "";
    if (typeof areaIdRaw === "string" && areaIdRaw.trim() !== "") {
      const n = parseInt(areaIdRaw.trim(), 10);
      if (!Number.isNaN(n) && n > 0) parsedArea = n;
    }

    const effectiveAreaMode: AreaPickMode =
      areasUnavailable ? "other" : areaMode;
    const effectiveParsedArea =
      effectiveAreaMode === "list" ? parsedArea : "";

    const v = {
      customerName: String(fd.get("customerName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      areaMode: effectiveAreaMode,
      areaId: effectiveParsedArea,
      customArea:
        effectiveAreaMode === "other"
          ? customArea.trim() || String(fd.get("customArea") ?? "")
          : "",
      animalKind: String(fd.get("animalKind") ?? ""),
      animalTypeOther: String(fd.get("animalTypeOther") ?? ""),
      problemSummary: String(fd.get("problemSummary") ?? ""),
    };

    const { errors, firstInvalid } = validateRequestForm(v, allowedAreaIds);
    if (firstInvalid) {
      setFieldErrors(errors);
      setValidationDialogOpen(true);
      focusRequestField(firstInvalid);
      return;
    }

    const utm =
      typeof window !== "undefined"
        ? utmPayloadFromSearchParams(window.location.search)
        : {};

    const landingPath =
      typeof window !== "undefined" && window.location.pathname
        ? window.location.pathname
        : "/request";

    const priorityRaw = String(fd.get("priority") ?? LeadPriority.NORMAL).trim();
    let priorityOut = priorityRaw;
    if (
      !emergencyLeadEnabled &&
      (priorityOut === LeadPriority.URGENT || priorityOut === LeadPriority.EMERGENCY)
    ) {
      priorityOut = LeadPriority.NORMAL;
    }

    const problemSummary = v.problemSummary.trim();

    const mediaUrlsRaw = String(fd.get("mediaUrls") ?? "").trim();
    const mediaUrls =
      mediaUrlsRaw.length > 0
        ? mediaUrlsRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
        : undefined;

    const payload: Record<string, unknown> = {
      customerName: v.customerName.trim(),
      phone: v.phone.trim(),
      whatsapp: v.whatsapp.trim() || undefined,
      address: String(fd.get("address") ?? "").trim() || undefined,
      animalKind: v.animalKind.trim() || undefined,
      animalTypeOther: v.animalTypeOther.trim() || undefined,
      serviceRequirement: problemSummary,
      priority: priorityOut,
      mediaUrls: mediaUrls && mediaUrls.length > 0 ? mediaUrls : undefined,
      ...utm,
      landingPath,
    };

    if (effectiveAreaMode === "list") {
      if (effectiveParsedArea !== "") {
        payload.areaId = effectiveParsedArea;
      }
    } else {
      payload.customArea = v.customArea.trim();
    }

    setLoading(true);
    setNetworkDialogOpen(false);
    setServerDialogOpen(false);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        messageBn?: string;
        id?: number;
        trackingCode?: string;
      };

      if (!res.ok) {
        const mapped = mapLeadApiErrorToFields(data.error);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          const firstKey = REQUEST_FIELD_ORDER.find((k) => mapped[k]);
          setValidationDialogOpen(true);
          if (firstKey) focusRequestField(firstKey);
        } else {
          const msg = resolveLeadSubmitFailureMessage(data);
          setServerMessageBn(msg);
          if (res.status >= 500 || data.error === "Failed to save lead") {
            setNetworkDialogOpen(true);
          } else {
            setServerDialogOpen(true);
          }
        }
        return;
      }

      setSuccessLeadId(typeof data.id === "number" ? data.id : undefined);
      setSuccessTrackingCode(
        typeof data.trackingCode === "string" && data.trackingCode.trim()
          ? data.trackingCode.trim()
          : undefined,
      );
      setSuccessDialogOpen(true);
    } catch {
      setNetworkDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [
    allowedAreaIds,
    areaMode,
    areasUnavailable,
    customArea,
    emergencyLeadEnabled,
  ]);

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void runSubmit();
    },
    [runSubmit],
  );

  const handleSuccessContinue = useCallback(() => {
    const form = formRef.current;
    if (form) {
      form.reset();
      setAnimalKind("");
      setAreaMode(initialAreas.length === 0 ? "other" : "list");
      setAreaId(initialAreaSelection(initialAreas, prefillAreaId));
      setCustomArea("");
    }
    setSuccessDialogOpen(false);
    const extra =
      successTrackingCode !== undefined && successTrackingCode !== ""
        ? `&track=${encodeURIComponent(successTrackingCode)}`
        : "";
    const q = successLeadId
      ? `?leadId=${encodeURIComponent(String(successLeadId))}${extra}`
      : "";
    router.push(`/thank-you${q}`);
  }, [initialAreas, prefillAreaId, router, successLeadId, successTrackingCode]);

  if (!leadFormEnabled) {
    return (
      <section
        className="mx-auto w-full min-w-0 max-w-lg px-4 py-8 sm:px-6"
        aria-labelledby="request-disabled-heading"
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <h2
            id="request-disabled-heading"
            className="text-lg font-semibold leading-snug text-amber-950 sm:text-xl"
          >
            অনলাইন অনুরোধ সাময়িক বন্ধ
          </h2>
          <p className="mt-3 text-base leading-relaxed text-amber-900">
            দয়া করে নিচের বাটন থেকে কল বা WhatsApp করে যোগাযোগ করুন।
          </p>
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={telHref}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-5 text-base font-semibold text-white hover:bg-emerald-700"
            >
              কল করুন
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl border-2 border-emerald-600 bg-white px-5 text-base font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              WhatsApp করুন
            </a>
          </div>
          <p className="mt-6">
            <Link
              href="/"
              className="text-base font-medium text-emerald-800 underline underline-offset-2"
            >
              হোমপেজে ফিরুন
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <CustomerDialog
        open={validationDialogOpen}
        onClose={() => setValidationDialogOpen(false)}
        title="কিছু তথ্য বাকি আছে"
        primaryLabel="ঠিক আছে"
        onPrimary={() => setValidationDialogOpen(false)}
      >
        <p>কয়েকটি ঘর খালি বা ভুল আছে। লাল চিহ্ন দেখে ঠিক করুন।</p>
      </CustomerDialog>

      <CustomerDialog
        open={successDialogOpen}
        onClose={handleSuccessContinue}
        title="জমা হয়েছে"
        primaryLabel="ধন্যবাদ পেজে যাই"
        onPrimary={handleSuccessContinue}
      >
        <p>
          অনুরোধ জমা হয়েছে। শীঘ্রই এই নম্বরে কল বা মেসেজ করব।
        </p>
      </CustomerDialog>

      <CustomerDialog
        open={networkDialogOpen}
        onClose={() => setNetworkDialogOpen(false)}
        title="জমা হয়নি"
        primaryLabel="আবার চেষ্টা করি"
        onPrimary={() => {
          setNetworkDialogOpen(false);
          void runSubmit();
        }}
        secondaryLabel="বন্ধ করি"
        onSecondary={() => setNetworkDialogOpen(false)}
        footerExtra={
          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
            <p className="text-center text-sm text-zinc-500">তাৎক্ষণিক দরকার হলে</p>
            <a
              href={telHref}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-zinc-900 px-4 text-base font-semibold text-white hover:bg-zinc-800"
            >
              কল করুন
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-emerald-600 bg-white px-4 text-base font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              WhatsApp করুন
            </a>
          </div>
        }
      >
        <p>
          {serverMessageBn.trim()
            ? serverMessageBn
            : "নেট সংযোগ বা সার্ভারে সমস্যা হতে পারে। একটু পরে আবার চেষ্টা করুন, অথবা কল বা WhatsApp করুন।"}
        </p>
      </CustomerDialog>

      <CustomerDialog
        open={serverDialogOpen}
        onClose={() => setServerDialogOpen(false)}
        title="জমা হয়নি"
        primaryLabel="ঠিক আছে"
        onPrimary={() => setServerDialogOpen(false)}
        footerExtra={
          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
            <a
              href={telHref}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white hover:bg-emerald-700"
            >
              কল করুন
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-emerald-600 bg-white px-4 text-base font-semibold text-emerald-900 hover:bg-emerald-50"
            >
              WhatsApp করুন
            </a>
          </div>
        }
      >
        <p>
          {serverMessageBn || "জমা দেওয়া যায়নি। একটু পরে আবার চেষ্টা করুন।"}
        </p>
      </CustomerDialog>

      <section
        className="mx-auto w-full min-w-0 max-w-lg px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5"
        aria-labelledby="simple-request-intro"
      >
        <div className="rounded-[var(--q-card-radius)] border border-emerald-100/80 bg-white p-5 shadow-[var(--q-card-shadow-sm)] ring-1 ring-emerald-900/[0.04] sm:p-6">
          <p
            id="simple-request-intro"
            className="text-center text-base font-semibold leading-snug text-zinc-800"
          >
            চিকিৎসার জন্য অনুরোধ
          </p>
          <p className="mt-2 text-center text-sm leading-relaxed text-zinc-600">
            সংক্ষেপে লিখে জমা দিন। প্রয়োজনে নিচে কল বা WhatsApp করুন।
          </p>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/90 p-3">
            <p className="text-center text-sm font-semibold text-emerald-900">
              জরুরিতে
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={telHref}
                className="inline-flex min-h-[48px] touch-manipulation items-center justify-center rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white shadow-sm active:bg-emerald-800"
              >
                কল
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] touch-manipulation items-center justify-center rounded-xl border-2 border-emerald-700 bg-white px-3 text-sm font-bold text-emerald-900 active:bg-emerald-50"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {areasUnavailable ? (
            <div
              className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-base text-amber-950 ring-1 ring-amber-200"
              role="status"
            >
              তালিকা থেকে এলাকা আসেনি। নিচে “অন্যান্য” থেকে এলাকার নাম লিখুন, অথবা কল /
              WhatsApp করুন।
            </div>
          ) : null}

          <form
            ref={formRef}
            className="mt-7 space-y-9"
            onSubmit={onSubmit}
            noValidate
          >
            <p className="text-center text-xs text-zinc-500">
              <span className="text-red-600">*</span> মানে আবশ্যক।
            </p>

            {/* যোগাযোগের তথ্য */}
            <fieldset className="min-w-0 space-y-5 border-0 p-0">
              <legend className="mb-1 w-full text-base font-bold text-zinc-900">
                যোগাযোগের তথ্য
              </legend>

              <div className="scroll-mt-24">
                <label
                  htmlFor={REQUEST_FIELD_IDS.customerName}
                  className="block text-base font-semibold text-zinc-900"
                >
                  আপনার নাম <span className="text-red-600">*</span>
                </label>
                <input
                  id={REQUEST_FIELD_IDS.customerName}
                  name="customerName"
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.customerName)}
                  aria-describedby={
                    fieldErrors.customerName ? ERR_ID.customerName : undefined
                  }
                  onInput={() => clearFieldError("customerName")}
                  className={`${inputClass(Boolean(fieldErrors.customerName))} min-h-[52px]`}
                  placeholder="যেমন: রহিম উদ্দিন"
                />
                {fieldErrors.customerName ? (
                  <p
                    id={ERR_ID.customerName}
                    className="mt-2 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {fieldErrors.customerName}
                  </p>
                ) : null}
              </div>

              <div className="scroll-mt-24">
                <label
                  htmlFor={REQUEST_FIELD_IDS.phone}
                  className="block text-base font-semibold text-zinc-900"
                >
                  মোবাইল নম্বর <span className="text-red-600">*</span>
                </label>
                <p className="mt-1 text-sm text-zinc-500">
                  যে নম্বরে কল বা মেসেজ করব।
                </p>
                <input
                  id={REQUEST_FIELD_IDS.phone}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={
                    fieldErrors.phone ? ERR_ID.phone : undefined
                  }
                  onInput={() => clearFieldError("phone")}
                  className={`${inputClass(Boolean(fieldErrors.phone))} min-h-[52px]`}
                  placeholder="০১১… অথবা +৮৮০১…"
                />
                {fieldErrors.phone ? (
                  <p
                    id={ERR_ID.phone}
                    className="mt-2 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {fieldErrors.phone}
                  </p>
                ) : null}
              </div>

              <div className="scroll-mt-24">
                <label
                  htmlFor={REQUEST_FIELD_IDS.whatsapp}
                  className="block text-base font-semibold text-zinc-900"
                >
                  আরেকটি নম্বর <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
                </label>
                <p className="mt-1 text-sm text-zinc-500">
                  WhatsApp বা অন্য ফোন — লাগলে দিন।
                </p>
                <input
                  id={REQUEST_FIELD_IDS.whatsapp}
                  name="whatsapp"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  aria-invalid={Boolean(fieldErrors.whatsapp)}
                  aria-describedby={
                    fieldErrors.whatsapp ? ERR_ID.whatsapp : undefined
                  }
                  onInput={() => clearFieldError("whatsapp")}
                  className={`${inputClass(Boolean(fieldErrors.whatsapp))} min-h-[52px]`}
                  placeholder="আলাদা নম্বর হলে লিখুন"
                />
                {fieldErrors.whatsapp ? (
                  <p
                    id={ERR_ID.whatsapp}
                    className="mt-2 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {fieldErrors.whatsapp}
                  </p>
                ) : null}
              </div>
            </fieldset>

            {/* এলাকা ও পশুর তথ্য */}
            <fieldset className="min-w-0 space-y-5 border-0 p-0">
              <legend className="mb-1 w-full text-base font-bold text-zinc-900">
                এলাকা ও পশুর তথ্য
              </legend>

              <div className="scroll-mt-24 space-y-4">
                {!areasUnavailable ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setListAreaMode();
                      }}
                      className={`min-h-[44px] touch-manipulation rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                        areaMode === "list"
                          ? "bg-emerald-700 text-white ring-emerald-700"
                          : "bg-white text-emerald-900 ring-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      তালিকা থেকে
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtherAreaMode();
                      }}
                      className={`min-h-[44px] touch-manipulation rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                        areaMode === "other"
                          ? "bg-emerald-700 text-white ring-emerald-700"
                          : "bg-white text-emerald-900 ring-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      অন্যান্য / আমার এলাকা তালিকায় নেই
                    </button>
                  </div>
                ) : null}

                {areaMode === "list" && !areasUnavailable ? (
                  <>
                    {popularAreas.length > 0 ? (
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">
                          জনপ্রিয় এলাকা
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {popularAreas.map((a) => {
                            const active = areaId === a.id;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  setListAreaMode();
                                  setAreaId(a.id);
                                  clearFieldError("areaId");
                                }}
                                className={`max-w-full min-h-[44px] touch-manipulation break-words rounded-full px-3 py-2 text-center text-sm font-semibold leading-snug ring-1 transition ${
                                  active
                                    ? "bg-emerald-700 text-white ring-emerald-700"
                                    : "bg-emerald-50 text-emerald-950 ring-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                {a.nameBn ?? a.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <SearchableAreaSelect
                      id={REQUEST_FIELD_IDS.areaId}
                      areas={initialAreas}
                      name="areaId"
                      label="সেবার এলাকা"
                      required
                      disabled={areasUnavailable}
                      placeholder="টাইপ করে খুঁজে বেছে নিন"
                      hint="যে এলাকায় দরকার, তালিকা থেকে বেছে নিন।"
                      value={areaId}
                      onChange={(id) => {
                        setListAreaMode();
                        setAreaId(id);
                        clearFieldError("areaId");
                      }}
                      error={fieldErrors.areaId}
                      errorId={ERR_ID.areaId}
                    />
                  </>
                ) : (
                  <div>
                    <label
                      htmlFor={REQUEST_FIELD_IDS.customArea}
                      className="block text-base font-semibold text-zinc-900"
                    >
                      আপনার এলাকার নাম <span className="text-red-600">*</span>
                    </label>
                    <p className="mt-1 text-sm text-zinc-500">
                      তালিকায় না থাকলে হল/মহল্লা/থানা লিখলেই চলবে।
                    </p>
                    <input
                      id={REQUEST_FIELD_IDS.customArea}
                      name="customArea"
                      autoComplete="address-level2"
                      aria-invalid={Boolean(fieldErrors.customArea)}
                      aria-describedby={
                        fieldErrors.customArea ? ERR_ID.customArea : undefined
                      }
                      value={customArea}
                      onChange={(e) => {
                        setCustomArea(e.target.value);
                        clearFieldError("customArea");
                      }}
                      className={`${inputClass(Boolean(fieldErrors.customArea))} min-h-[52px]`}
                      placeholder="যেমন: শ্যামপুর, রুপনগর…"
                    />
                    {fieldErrors.customArea ? (
                      <p
                        id={ERR_ID.customArea}
                        className="mt-2 text-sm font-medium text-red-700"
                        role="alert"
                      >
                        {fieldErrors.customArea}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="scroll-mt-24">
                <label
                  htmlFor={REQUEST_FIELD_IDS.animalKind}
                  className="block text-base font-semibold text-zinc-900"
                >
                  পশুর ধরন <span className="text-red-600">*</span>
                </label>
                <select
                  id={REQUEST_FIELD_IDS.animalKind}
                  name="animalKind"
                  aria-invalid={Boolean(fieldErrors.animalKind)}
                  aria-describedby={
                    fieldErrors.animalKind ? ERR_ID.animalKind : undefined
                  }
                  value={animalKind}
                  onChange={(ev) => {
                    setAnimalKind(ev.target.value);
                    clearFieldError("animalKind");
                    clearFieldError("animalTypeOther");
                  }}
                  className={`${inputClass(Boolean(fieldErrors.animalKind))} min-h-[52px]`}
                >
                  <option value="" disabled>
                    — বেছে নিন —
                  </option>
                  {ANIMAL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.animalKind ? (
                  <p
                    id={ERR_ID.animalKind}
                    className="mt-2 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {fieldErrors.animalKind}
                  </p>
                ) : null}
              </div>

              {showOtherAnimal ? (
                <div className="scroll-mt-24">
                  <label
                    htmlFor={REQUEST_FIELD_IDS.animalTypeOther}
                    className="block text-base font-semibold text-zinc-900"
                  >
                    পশুর বিবরণ <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={REQUEST_FIELD_IDS.animalTypeOther}
                    name="animalTypeOther"
                    aria-invalid={Boolean(fieldErrors.animalTypeOther)}
                    aria-describedby={
                      fieldErrors.animalTypeOther
                        ? ERR_ID.animalTypeOther
                        : undefined
                    }
                    onInput={() => clearFieldError("animalTypeOther")}
                    className={`${inputClass(Boolean(fieldErrors.animalTypeOther))} min-h-[52px]`}
                    placeholder="যেমন: দেশি গরু, খাসি…"
                  />
                  {fieldErrors.animalTypeOther ? (
                    <p
                      id={ERR_ID.animalTypeOther}
                      className="mt-2 text-sm font-medium text-red-700"
                      role="alert"
                    >
                      {fieldErrors.animalTypeOther}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="scroll-mt-24">
                <label
                  htmlFor={REQUEST_FIELD_IDS.problemSummary}
                  className="block text-base font-semibold text-zinc-900"
                >
                  সমস্যাটা কী? <span className="text-red-600">*</span>
                </label>
                <p className="mt-1 text-sm text-zinc-500">
                  লক্ষণ আর কত দিন ধরে — ছোট করে লিখুন।
                </p>
                <textarea
                  id={REQUEST_FIELD_IDS.problemSummary}
                  name="problemSummary"
                  rows={4}
                  aria-invalid={Boolean(fieldErrors.problemSummary)}
                  aria-describedby={
                    fieldErrors.problemSummary
                      ? ERR_ID.problemSummary
                      : undefined
                  }
                  onInput={() => clearFieldError("problemSummary")}
                  className={`${inputClass(Boolean(fieldErrors.problemSummary))} resize-y leading-relaxed`}
                  placeholder="যেমন: খাবার কম খাচ্ছে, জ্বর মনে হচ্ছে…"
                />
                {fieldErrors.problemSummary ? (
                  <p
                    id={ERR_ID.problemSummary}
                    className="mt-2 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {fieldErrors.problemSummary}
                  </p>
                ) : null}
              </div>

              {emergencyLeadEnabled ? (
                <div>
                  <label
                    htmlFor="priority"
                    className="block text-base font-semibold text-zinc-900"
                  >
                    জরুরি মনে হচ্ছে?
                  </label>
                  <p className="mt-1 text-sm text-zinc-500">
                    প্রকৃত জরুরি না হলে জরুরি বেছে নেবেন না। সন্দেহ হলে আগে কল করুন।
                  </p>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue={LeadPriority.NORMAL}
                    className={`${inputClass(false)} min-h-[52px]`}
                  >
                    <option value={LeadPriority.NORMAL}>না — সাধারণ</option>
                    <option value={LeadPriority.URGENT}>জরুরি</option>
                    <option value={LeadPriority.EMERGENCY}>ইমার্জেন্সি</option>
                  </select>
                </div>
              ) : (
                <input type="hidden" name="priority" value={LeadPriority.NORMAL} />
              )}
            </fieldset>

            {/* অতিরিক্ত তথ্য */}
            <fieldset className="min-w-0 space-y-5 border-0 p-0">
              <legend className="mb-1 w-full text-base font-bold text-zinc-900">
                অতিরিক্ত তথ্য <span className="text-sm font-normal text-zinc-500">(ঐচ্ছিক)</span>
              </legend>

              <div>
                <label htmlFor="address" className="block text-base font-semibold text-zinc-900">
                  বাড়ি বা পরিচিত জায়গা
                </label>
                <p className="mt-1 text-sm text-zinc-500">খুঁজে পেতে সহজ হবে।</p>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  className={`${inputClass(false)} resize-y leading-relaxed`}
                  placeholder="গ্রাম/মহল্লা, রোডের নাম, চেনা দোকান…"
                />
              </div>

              <div>
                <label htmlFor="mediaUrls" className="block text-base font-semibold text-zinc-900">
                  ছবি বা ভিডিওর লিংক
                </label>
                <p className="mt-1 text-sm text-zinc-500">প্রতি লাইনে একটি লিংক।</p>
                <textarea
                  id="mediaUrls"
                  name="mediaUrls"
                  rows={3}
                  className={`${inputClass(false)} resize-y font-mono text-sm leading-relaxed sm:text-base`}
                  placeholder="https://…"
                />
              </div>
            </fieldset>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (areaMode === "list" && areasUnavailable)}
                className="min-h-[56px] w-full touch-manipulation rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "পাঠানো হচ্ছে…" : "অনুরোধ জমা দিন"}
              </button>
              <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
                জমা দিলে যোগাযোগের জন্য এই নম্বর ব্যবহার করা যেতে পারে।
              </p>
            </div>
          </form>

          <p className="mt-7 text-center text-sm text-zinc-500">
            <Link
              href="/"
              className="font-medium text-emerald-800 underline underline-offset-2"
            >
              হোমে ফিরুন
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
