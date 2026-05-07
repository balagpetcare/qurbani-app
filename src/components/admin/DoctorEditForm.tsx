"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { SearchableAreaMultiSelect } from "@/components/forms/SearchableAreaMultiSelect";
import { DOCTOR_AVAILABILITY_OPTIONS } from "@/lib/admin-form-labels";

type AreaOpt = { id: number; name: string; nameBn: string | null; nameEn?: string | null };

type Props = {
  doctorId: number;
  initial: {
    name: string;
    phone: string;
    whatsapp: string | null;
    email: string | null;
    notes: string | null;
    qualification: string | null;
    experienceSummary: string | null;
    shortBio: string | null;
    availableTimeText: string | null;
    availabilityStatus: string | null;
    profilePhotoUrl: string | null;
    homeVisitFeeMin: number | null;
    homeVisitFeeMax: number | null;
    feeNote: string | null;
    notifyEmail: boolean;
    notifySms: boolean;
    notifyWhatsApp: boolean;
    isActive: boolean;
    emergencyAvailable: boolean;
    areaIds: number[];
  };
  areas: AreaOpt[];
};

export function DoctorEditForm({ doctorId, initial, areas }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [areaIds, setAreaIds] = useState<number[]>(initial.areaIds);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const passwordRaw = String(fd.get("password") ?? "").trim();
    const feeMinRaw = String(fd.get("homeVisitFeeMin") ?? "").trim();
    const feeMaxRaw = String(fd.get("homeVisitFeeMax") ?? "").trim();

    const patchBody: Record<string, unknown> = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      whatsapp: String(fd.get("whatsapp") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      notes: String(fd.get("notes") ?? "").trim() || null,
      qualification: String(fd.get("qualification") ?? "").trim() || null,
      experienceSummary: String(fd.get("experienceSummary") ?? "").trim() || null,
      shortBio: String(fd.get("shortBio") ?? "").trim() || null,
      availableTimeText: String(fd.get("availableTimeText") ?? "").trim() || null,
      availabilityStatus: String(fd.get("availabilityStatus") ?? "").trim() || null,
      profilePhotoUrl: String(fd.get("profilePhotoUrl") ?? "").trim() || null,
      homeVisitFeeMin:
        feeMinRaw === ""
          ? null
          : Number.isNaN(parseInt(feeMinRaw, 10))
            ? null
            : parseInt(feeMinRaw, 10),
      homeVisitFeeMax:
        feeMaxRaw === ""
          ? null
          : Number.isNaN(parseInt(feeMaxRaw, 10))
            ? null
            : parseInt(feeMaxRaw, 10),
      feeNote: String(fd.get("feeNote") ?? "").trim() || null,
      notifyEmail: fd.get("notifyEmail") === "on",
      notifySms: fd.get("notifySms") === "on",
      notifyWhatsApp: fd.get("notifyWhatsApp") === "on",
      isActive: fd.get("isActive") === "on",
      emergencyAvailable: fd.get("emergencyAvailable") === "on",
    };
    if (passwordRaw.length > 0) {
      patchBody.password = passwordRaw;
    }

    if (areaIds.length === 0) {
      setMessage({ kind: "err", text: "কমপক্ষে একটি এলাকা বেছে নিন।" });
      setLoading(false);
      return;
    }

    try {
      const resPatch = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const patchData = (await resPatch.json()) as { error?: string };
      if (!resPatch.ok) {
        setMessage({ kind: "err", text: patchData.error ?? "আপডেট ব্যর্থ।" });
        return;
      }

      const resAreas = await fetch(`/api/admin/doctors/${doctorId}/areas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaIds }),
      });
      const areasData = (await resAreas.json()) as { error?: string };
      if (!resAreas.ok) {
        setMessage({
          kind: "err",
          text: areasData.error ?? "এলাকা আপডেট ব্যর্থ।",
        });
        return;
      }

      setMessage({ kind: "ok", text: "সংরক্ষিত।" });
      const pw = form.elements.namedItem("password") as HTMLInputElement | null;
      if (pw) pw.value = "";
      router.refresh();
    } catch {
      setMessage({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">ডাক্তার সম্পাদনা</h2>

      {message ? (
        <div
          role={message.kind === "err" ? "alert" : "status"}
          className={
            message.kind === "ok"
              ? "mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200"
              : "mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800 ring-1 ring-red-200"
          }
        >
          {message.text}
        </div>
      ) : null}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ed-name" className="block text-sm font-medium text-zinc-700">
              নাম <span className="text-red-600">*</span>
            </label>
            <input
              id="ed-name"
              name="name"
              required
              defaultValue={initial.name}
                  className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="ed-phone" className="block text-sm font-medium text-zinc-700">
              ফোন <span className="text-red-600">*</span>
            </label>
            <input
              id="ed-phone"
              name="phone"
              type="tel"
              required
              defaultValue={initial.phone}
                  className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="ed-wa" className="block text-sm font-medium text-zinc-700">
              ওয়াটসঅ্যাপ নম্বর
            </label>
            <input
              id="ed-wa"
              name="whatsapp"
              type="tel"
              defaultValue={initial.whatsapp ?? ""}
                  className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ed-email" className="block text-sm font-medium text-zinc-700">
              ইমেইল
            </label>
            <input
              id="ed-email"
              name="email"
              type="email"
              defaultValue={initial.email ?? ""}
                  className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ed-pass" className="block text-sm font-medium text-zinc-700">
              নতুন পাসওয়ার্ড <span className="font-normal text-zinc-500">(খালি রাখলে পরিবর্তন হবে না)</span>
            </label>
            <input
              id="ed-pass"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
                  className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
            <p className="text-sm font-semibold text-zinc-800">প্রোফাইল (পাবলিক/ল্যান্ডিং)</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ed-qual" className="block text-sm font-medium text-zinc-700">
                  যোগ্যতা
                </label>
                <input
                  id="ed-qual"
                  name="qualification"
                  defaultValue={initial.qualification ?? ""}
                  className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-exp" className="block text-sm font-medium text-zinc-700">
                  অভিজ্ঞতা সারাংশ
                </label>
                <textarea
                  id="ed-exp"
                  name="experienceSummary"
                  rows={2}
                  defaultValue={initial.experienceSummary ?? ""}
                  className="mt-1 w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-bio" className="block text-sm font-medium text-zinc-700">
                  সংক্ষিপ্ত বায়ো
                </label>
                <textarea
                  id="ed-bio"
                  name="shortBio"
                  rows={2}
                  defaultValue={initial.shortBio ?? ""}
                  className="mt-1 w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-time" className="block text-sm font-medium text-zinc-700">
                  কাজের সময় টেক্সট
                </label>
                <textarea
                  id="ed-time"
                  name="availableTimeText"
                  rows={2}
                  defaultValue={initial.availableTimeText ?? ""}
                  className="mt-1 w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-avail" className="block text-sm font-medium text-zinc-700">
                  উপলব্ধতা স্ট্যাটাস
                </label>
                <select
                  id="ed-avail"
                  name="availabilityStatus"
                  defaultValue={initial.availabilityStatus ?? "AVAILABLE"}
                  className="mt-1 min-h-[48px] w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
                >
                  <option value="">— খালি —</option>
                  {DOCTOR_AVAILABILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-photo" className="block text-sm font-medium text-zinc-700">
                  প্রোফাইল ছবির URL (HTTPS)
                </label>
                <input
                  id="ed-photo"
                  name="profilePhotoUrl"
                  defaultValue={initial.profilePhotoUrl ?? ""}
                  className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label htmlFor="ed-fee-min" className="block text-sm font-medium text-zinc-700">
                  হোম ভিজিট ফি — সর্বনিম্ন (৳)
                </label>
                <input
                  id="ed-fee-min"
                  name="homeVisitFeeMin"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  defaultValue={initial.homeVisitFeeMin ?? ""}
                  className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="খালি = সরানো"
                />
              </div>
              <div>
                <label htmlFor="ed-fee-max" className="block text-sm font-medium text-zinc-700">
                  হোম ভিজিট ফি — সর্বোচ্চ (৳)
                </label>
                <input
                  id="ed-fee-max"
                  name="homeVisitFeeMax"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  defaultValue={initial.homeVisitFeeMax ?? ""}
                  className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="খালি = সরানো"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ed-fee-note" className="block text-sm font-medium text-zinc-700">
                  ফি সম্পর্কিত নোট (পাবলিক)
                </label>
                <textarea
                  id="ed-fee-note"
                  name="feeNote"
                  rows={2}
                  maxLength={500}
                  defaultValue={initial.feeNote ?? ""}
                  className="mt-1 w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="notifyEmail"
                  type="checkbox"
                  defaultChecked={initial.notifyEmail}
                  className="size-4 rounded border-zinc-300 text-emerald-600"
                />
                নোটিফাই ইমেইল
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  name="notifySms"
                  type="checkbox"
                  defaultChecked={initial.notifySms}
                  className="size-4 rounded border-zinc-300 text-emerald-600"
                />
                নোটিফাই SMS
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  name="notifyWhatsApp"
                  type="checkbox"
                  defaultChecked={initial.notifyWhatsApp}
                  className="size-4 rounded border-zinc-300 text-emerald-600"
                />
                নোটিফাই ওয়াটসঅ্যাপ
              </label>
            </div>
          </div>

          <div className="sm:col-span-2">
            <SearchableAreaMultiSelect
              areas={areas}
              label="সেবার এলাকা"
              required
              disabled={areas.length === 0}
              value={areaIds}
              onChange={setAreaIds}
            />
          </div>

          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                name="emergencyAvailable"
                type="checkbox"
                defaultChecked={initial.emergencyAvailable}
                className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              জরুরি সেবা উপলব্ধ
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={initial.isActive}
                className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              সক্রিয়
            </label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ed-notes" className="block text-sm font-medium text-zinc-700">
              নোট
            </label>
            <textarea
              id="ed-notes"
              name="notes"
              rows={3}
              defaultValue={initial.notes ?? ""}
              className="mt-1 min-h-[120px] w-full resize-y rounded-2xl border border-zinc-300 px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full touch-manipulation rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
        >
          {loading ? "সংরক্ষণ…" : "সংরক্ষণ করুন"}
        </button>
      </form>
    </section>
  );
}
