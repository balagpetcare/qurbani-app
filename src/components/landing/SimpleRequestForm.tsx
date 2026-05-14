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
import { trackLeadSubmit } from "@/lib/analytics/googleAds";
import { utmPayloadFromSearchParams } from "@/lib/utm-from-search";
import { TrackedOutboundAnchor } from "@/components/analytics/TrackedOutboundAnchor";

const FORM_ID = "qurbani-request-form";

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

const PROBLEM_CHIPS = [
  "খাচ্ছে না",
  "জ্বর",
  "দুর্বল",
  "বমি",
  "পাতলা পায়খানা",
  "হাঁটতে পারছে না",
] as const;

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

function fieldWrap(invalid: boolean): string {
  return [
    "w-full max-w-full rounded-2xl border bg-white px-3.5 py-3 text-base text-zinc-900 shadow-sm outline-none transition",
    "placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25",
    invalid
      ? "border-red-400 ring-2 ring-red-100"
      : "border-zinc-200/90 hover:border-zinc-300",
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
  const problemRef = useRef<HTMLTextAreaElement>(null);

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
  const [priority, setPriority] = useState<LeadPriority>(LeadPriority.NORMAL);

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

  const appendProblemChip = useCallback((text: string) => {
    const el = problemRef.current;
    if (!el) return;
    const cur = el.value.trim();
    el.value = cur ? `${cur}, ${text}` : text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    clearFieldError("problemSummary");
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

    let priorityOut = priority;
    if (
      !emergencyLeadEnabled &&
      (priorityOut === LeadPriority.URGENT || priorityOut === LeadPriority.EMERGENCY)
    ) {
      priorityOut = LeadPriority.NORMAL;
    }

    const problemSummary = v.problemSummary.trim();

    const payload: Record<string, unknown> = {
      customerName: v.customerName.trim(),
      phone: v.phone.trim(),
      whatsapp: v.whatsapp.trim() || undefined,
      address: String(fd.get("address") ?? "").trim() || undefined,
      animalKind: v.animalKind.trim() || undefined,
      animalTypeOther: v.animalTypeOther.trim() || undefined,
      serviceRequirement: problemSummary,
      priority: priorityOut,
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
      trackLeadSubmit({
        transaction_id:
          typeof data.trackingCode === "string" && data.trackingCode.trim()
            ? data.trackingCode.trim()
            : typeof data.id === "number"
              ? `lead-${data.id}`
              : undefined,
      });
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
    priority,
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
      setPriority(LeadPriority.NORMAL);
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

  const submitLabel = loading ? "পাঠানো হচ্ছে…" : "ডাক্তারের অনুরোধ পাঠান";

  const submitButtonClass =
    "min-h-[52px] w-full touch-manipulation rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-base font-bold text-white shadow-md shadow-emerald-900/15 transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-55";

  if (!leadFormEnabled) {
    return (
      <section
        className="mx-auto w-full min-w-0 max-w-md px-4 py-6 sm:px-5"
        aria-labelledby="request-disabled-heading"
      >
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/95 p-5 text-center shadow-sm">
          <h2
            id="request-disabled-heading"
            className="text-base font-semibold text-amber-950"
          >
            অনলাইন অনুরোধ সাময়িক বন্ধ
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/95">
            কল বা WhatsApp করে যোগাযোগ করুন।
          </p>
          <div className="mx-auto mt-4 grid grid-cols-2 gap-2">
            <TrackedOutboundAnchor
              href={telHref}
              tracking="tel"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 text-sm font-bold text-white"
            >
              কল
            </TrackedOutboundAnchor>
            <TrackedOutboundAnchor
              href={waHref}
              tracking="whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-700 bg-white text-sm font-bold text-emerald-900"
            >
              WhatsApp
            </TrackedOutboundAnchor>
          </div>
          <p className="mt-4">
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-800 underline underline-offset-2"
            >
              হোম
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
        title="কিছু তথ্য বাকি"
        primaryLabel="ঠিক আছে"
        onPrimary={() => setValidationDialogOpen(false)}
      >
        <p className="text-sm text-zinc-700">
          লাল চিহ্নিত ঘরগুলো ঠিক করে আবার চেষ্টা করুন।
        </p>
      </CustomerDialog>

      <CustomerDialog
        open={successDialogOpen}
        onClose={handleSuccessContinue}
        title="গ্রহণ হয়েছে"
        primaryLabel="চালিয়ে যান"
        onPrimary={handleSuccessContinue}
      >
        <p className="text-sm text-zinc-700">
          আপনার অনুরোধ জমা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।
        </p>
      </CustomerDialog>

      <CustomerDialog
        open={networkDialogOpen}
        onClose={() => setNetworkDialogOpen(false)}
        title="জমা হয়নি"
        primaryLabel="আবার চেষ্টা"
        onPrimary={() => {
          setNetworkDialogOpen(false);
          void runSubmit();
        }}
        secondaryLabel="বন্ধ"
        onSecondary={() => setNetworkDialogOpen(false)}
        footerExtra={
          <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
            <TrackedOutboundAnchor
              href={telHref}
              tracking="tel"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white"
            >
              কল
            </TrackedOutboundAnchor>
            <TrackedOutboundAnchor
              href={waHref}
              tracking="whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-600 bg-white text-sm font-semibold text-emerald-900"
            >
              WhatsApp
            </TrackedOutboundAnchor>
          </div>
        }
      >
        <p className="text-sm">
          {serverMessageBn.trim()
            ? serverMessageBn
            : "নেটওয়ার্ক সমস্যা। পরে আবার চেষ্টা করুন।"}
        </p>
      </CustomerDialog>

      <CustomerDialog
        open={serverDialogOpen}
        onClose={() => setServerDialogOpen(false)}
        title="জমা হয়নি"
        primaryLabel="ঠিক আছে"
        onPrimary={() => setServerDialogOpen(false)}
        footerExtra={
          <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
            <TrackedOutboundAnchor
              href={telHref}
              tracking="tel"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 text-sm font-semibold text-white"
            >
              কল
            </TrackedOutboundAnchor>
            <TrackedOutboundAnchor
              href={waHref}
              tracking="whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-600 bg-white text-sm font-semibold text-emerald-900"
            >
              WhatsApp
            </TrackedOutboundAnchor>
          </div>
        }
      >
        <p className="text-sm">{serverMessageBn || "আবার চেষ্টা করুন।"}</p>
      </CustomerDialog>

      <section
        className="mx-auto w-full min-w-0 max-w-md px-4 pb-28 pt-1 sm:px-5 sm:pb-24"
        aria-label="ভেটেরিনারি অনুরোধ ফর্ম"
      >
        <div className="mb-3 flex gap-2 rounded-2xl border border-emerald-100/80 bg-emerald-50/60 p-2">
          <TrackedOutboundAnchor
            href={telHref}
            tracking="tel"
            className="flex flex-1 items-center justify-center rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-sm"
          >
            জরুরি কল
          </TrackedOutboundAnchor>
          <TrackedOutboundAnchor
            href={waHref}
            tracking="whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center rounded-xl border border-emerald-700 bg-white py-2.5 text-xs font-bold text-emerald-900"
          >
            WhatsApp
          </TrackedOutboundAnchor>
        </div>

        <form
          id={FORM_ID}
          ref={formRef}
          className="space-y-5"
          onSubmit={onSubmit}
          noValidate
        >
          <input type="hidden" name="priority" value={priority} />

          <div>
            <label
              htmlFor={REQUEST_FIELD_IDS.customerName}
              className="sr-only"
            >
              আপনার নাম (আবশ্যক)
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
              className={`${fieldWrap(Boolean(fieldErrors.customerName))} min-h-[50px]`}
              placeholder="আপনার নাম *"
            />
            {fieldErrors.customerName ? (
              <p
                id={ERR_ID.customerName}
                className="mt-1.5 text-xs font-medium text-red-600"
                role="alert"
              >
                {fieldErrors.customerName}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={REQUEST_FIELD_IDS.phone} className="sr-only">
              মোবাইল (আবশ্যক)
            </label>
            <input
              id={REQUEST_FIELD_IDS.phone}
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? ERR_ID.phone : undefined}
              onInput={() => clearFieldError("phone")}
              className={`${fieldWrap(Boolean(fieldErrors.phone))} min-h-[50px]`}
              placeholder="মোবাইল নম্বর * (০১১…)"
            />
            {fieldErrors.phone ? (
              <p
                id={ERR_ID.phone}
                className="mt-1.5 text-xs font-medium text-red-600"
                role="alert"
              >
                {fieldErrors.phone}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            {!areasUnavailable ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setListAreaMode()}
                  className={`min-h-[40px] flex-1 rounded-xl text-xs font-bold transition ${
                    areaMode === "list"
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  এলাকা তালিকা
                </button>
                <button
                  type="button"
                  onClick={() => setOtherAreaMode()}
                  className={`min-h-[40px] flex-1 rounded-xl text-xs font-bold transition ${
                    areaMode === "other"
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  অন্যান্য
                </button>
              </div>
            ) : null}

            {areaMode === "list" && !areasUnavailable ? (
              <>
                {popularAreas.length > 0 ? (
                  <details className="group rounded-2xl border border-zinc-200/90 bg-zinc-50/50 px-3 py-2">
                    <summary className="cursor-pointer list-none text-xs font-semibold text-zinc-700 marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        জনপ্রিয় এলাকা
                        <span className="text-zinc-400 group-open:rotate-180">▼</span>
                      </span>
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5 pb-1">
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
                            className={`max-w-full rounded-full px-3 py-1.5 text-xs font-semibold leading-snug transition ${
                              active
                                ? "bg-emerald-700 text-white"
                                : "bg-white text-emerald-950 ring-1 ring-zinc-200"
                            }`}
                          >
                            {a.nameBn ?? a.name}
                          </button>
                        );
                      })}
                    </div>
                  </details>
                ) : null}

                <SearchableAreaSelect
                  id={REQUEST_FIELD_IDS.areaId}
                  areas={initialAreas}
                  name="areaId"
                  label="এলাকা"
                  required
                  disabled={areasUnavailable}
                  placeholder="এলাকা খুঁজে বেছে নিন…"
                  hint=""
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
                <label htmlFor={REQUEST_FIELD_IDS.customArea} className="sr-only">
                  এলাকার নাম
                </label>
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
                  className={`${fieldWrap(Boolean(fieldErrors.customArea))} min-h-[50px]`}
                  placeholder="এলাকার নাম * (হল/থানা)"
                />
                {fieldErrors.customArea ? (
                  <p
                    id={ERR_ID.customArea}
                    className="mt-1.5 text-xs font-medium text-red-600"
                    role="alert"
                  >
                    {fieldErrors.customArea}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <label htmlFor={REQUEST_FIELD_IDS.animalKind} className="sr-only">
              পশুর ধরন
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
              className={`${fieldWrap(Boolean(fieldErrors.animalKind))} min-h-[50px]`}
            >
              <option value="" disabled>
                পশুর ধরন *
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
                className="mt-1.5 text-xs font-medium text-red-600"
                role="alert"
              >
                {fieldErrors.animalKind}
              </p>
            ) : null}
          </div>

          {showOtherAnimal ? (
            <div>
              <label htmlFor={REQUEST_FIELD_IDS.animalTypeOther} className="sr-only">
                পশুর বিবরণ
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
                className={`${fieldWrap(Boolean(fieldErrors.animalTypeOther))} min-h-[50px]`}
                placeholder="পশুর ধরন লিখুন *"
              />
              {fieldErrors.animalTypeOther ? (
                <p
                  id={ERR_ID.animalTypeOther}
                  className="mt-1.5 text-xs font-medium text-red-600"
                  role="alert"
                >
                  {fieldErrors.animalTypeOther}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label htmlFor={REQUEST_FIELD_IDS.problemSummary} className="sr-only">
              সমস্যা
            </label>
            <textarea
              ref={problemRef}
              id={REQUEST_FIELD_IDS.problemSummary}
              name="problemSummary"
              rows={3}
              aria-invalid={Boolean(fieldErrors.problemSummary)}
              aria-describedby={
                fieldErrors.problemSummary ? ERR_ID.problemSummary : undefined
              }
              onInput={() => clearFieldError("problemSummary")}
              className={`${fieldWrap(Boolean(fieldErrors.problemSummary))} min-h-[96px] resize-none leading-relaxed`}
              placeholder="সমস্যাটা সংক্ষেপে লিখুন *"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PROBLEM_CHIPS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => appendProblemChip(t)}
                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100"
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              প্রয়োজনে ডাক্তার WhatsApp-এ ছবি চাইতে পারেন।
            </p>
            {fieldErrors.problemSummary ? (
              <p
                id={ERR_ID.problemSummary}
                className="mt-1.5 text-xs font-medium text-red-600"
                role="alert"
              >
                {fieldErrors.problemSummary}
              </p>
            ) : null}
          </div>

          {emergencyLeadEnabled ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                অগ্রাধিকার
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100/80 p-1">
                <button
                  type="button"
                  onClick={() => setPriority(LeadPriority.NORMAL)}
                  className={`min-h-[44px] rounded-xl text-sm font-bold transition ${
                    priority === LeadPriority.NORMAL
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-zinc-600"
                  }`}
                >
                  সাধারণ
                </button>
                <button
                  type="button"
                  onClick={() => setPriority(LeadPriority.URGENT)}
                  className={`min-h-[44px] rounded-xl text-sm font-bold transition ${
                    priority === LeadPriority.URGENT ||
                    priority === LeadPriority.EMERGENCY
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-zinc-600"
                  }`}
                >
                  জরুরি
                </button>
              </div>
            </div>
          ) : null}

          <details className="rounded-2xl border border-zinc-200/80 bg-white/60 px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-800 marker:text-zinc-400">
              ঐচ্ছিক বিস্তারিত
            </summary>
            <div className="mt-3 space-y-3 pb-1">
              <div>
                <label htmlFor={REQUEST_FIELD_IDS.whatsapp} className="sr-only">
                  অতিরিক্ত WhatsApp নম্বর
                </label>
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
                  className={`${fieldWrap(Boolean(fieldErrors.whatsapp))} min-h-[48px]`}
                  placeholder="অন্য WhatsApp (ঐচ্ছিক)"
                />
                {fieldErrors.whatsapp ? (
                  <p
                    id={ERR_ID.whatsapp}
                    className="mt-1.5 text-xs font-medium text-red-600"
                    role="alert"
                  >
                    {fieldErrors.whatsapp}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="address" className="sr-only">
                  ঠিকানা বা চেনা জায়গা
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  className={`${fieldWrap(false)} resize-none text-sm leading-relaxed`}
                  placeholder="ঠিকানা / চেনা দোকান (ঐচ্ছিক)"
                />
              </div>
            </div>
          </details>

          <div className="hidden md:block">
            <button
              type="submit"
              disabled={loading || (areaMode === "list" && areasUnavailable)}
              className={submitButtonClass}
            >
              {submitLabel}
            </button>
          </div>
        </form>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden">
          <div className="pointer-events-auto border-t border-emerald-100/90 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md">
            <button
              type="submit"
              form={FORM_ID}
              disabled={loading || (areaMode === "list" && areasUnavailable)}
              className={submitButtonClass}
            >
              {submitLabel}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-100/90 bg-emerald-50/40 px-4 py-3 text-center text-xs leading-relaxed text-emerald-950/90">
          <p className="font-medium">ডাক্তার দ্রুত যোগাযোগ করবেন</p>
          <p className="mt-1">আপনার তথ্য নিরাপদ রাখা হয়</p>
          <p className="mt-1">প্রয়োজনে সরাসরি কল করা হবে</p>
        </div>

        <p className="mt-5 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-emerald-800 underline underline-offset-2"
          >
            হোমে ফিরুন
          </Link>
        </p>
      </section>
    </>
  );
}
