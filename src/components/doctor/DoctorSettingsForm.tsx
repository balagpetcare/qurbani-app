"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SearchableAreaMultiSelect } from "@/components/forms/SearchableAreaMultiSelect";
import { AppCard } from "@/components/ui/AppCard";
import {
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
} from "@/lib/phone";

type AreaOpt = { id: number; name: string; nameBn: string | null };

export type DoctorSelfPayload = {
  id: number;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  emergencyAvailable: boolean;
  qualification: string | null;
  experienceSummary: string | null;
  shortBio: string | null;
  availableTimeText: string | null;
  availabilityStatus: string | null;
  profilePhotoUrl: string | null;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWhatsApp: boolean;
  doctorAreas: { area: AreaOpt & { slug: string } }[];
  doctorAreaPreferenceRequests: {
    id: number;
    requestedAreaIds: unknown;
    createdAt: Date | string;
  }[];
};

function parsePendingAreaIds(reqs: DoctorSelfPayload["doctorAreaPreferenceRequests"]): number[] {
  const r = reqs[0];
  if (!r?.requestedAreaIds) return [];
  const raw = r.requestedAreaIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is number => typeof x === "number" && Number.isInteger(x) && x > 0,
  );
}

type Props = {
  initialDoctor: DoctorSelfPayload;
};

export function DoctorSettingsForm({ initialDoctor }: Props) {
  const router = useRouter();
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [prefAreaIds, setPrefAreaIds] = useState<number[]>(() =>
    parsePendingAreaIds(initialDoctor.doctorAreaPreferenceRequests),
  );

  const [name, setName] = useState(initialDoctor.name);
  const [phone, setPhone] = useState(initialDoctor.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(initialDoctor.whatsapp ?? "");
  const [email, setEmail] = useState(initialDoctor.email ?? "");
  const [qualification, setQualification] = useState(initialDoctor.qualification ?? "");
  const [experienceSummary, setExperienceSummary] = useState(
    initialDoctor.experienceSummary ?? "",
  );
  const [shortBio, setShortBio] = useState(initialDoctor.shortBio ?? "");
  const [availableTimeText, setAvailableTimeText] = useState(
    initialDoctor.availableTimeText ?? "",
  );
  const [availabilityStatus, setAvailabilityStatus] = useState(
    initialDoctor.availabilityStatus ?? "AVAILABLE",
  );
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(
    initialDoctor.profilePhotoUrl ?? "",
  );
  const [emergencyAvailable, setEmergencyAvailable] = useState(
    initialDoctor.emergencyAvailable,
  );
  const [notifyEmail, setNotifyEmail] = useState(initialDoctor.notifyEmail);
  const [notifySms, setNotifySms] = useState(initialDoctor.notifySms);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(initialDoctor.notifyWhatsApp);

  const [loading, setLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/areas")
      .then((r) => r.json() as Promise<{ areas?: AreaOpt[]; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        if (data.error || !data.areas) {
          setAreasError("এলাকার তালিকা লোড করা যায়নি।");
          return;
        }
        setAreas(data.areas);
      })
      .catch(() => {
        if (!cancelled) setAreasError("এলাকার তালিকা লোড করা যায়নি।");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assignedLabels = useMemo(
    () =>
      initialDoctor.doctorAreas
        .map((x) => x.area.nameBn ?? x.area.name)
        .join(" · ") || "এখনও এলাকা নির্ধারিত নয়",
    [initialDoctor.doctorAreas],
  );

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          qualification: qualification.trim() || null,
          experienceSummary: experienceSummary.trim() || null,
          shortBio: shortBio.trim() || null,
          availableTimeText: availableTimeText.trim() || null,
          availabilityStatus: availabilityStatus || null,
          profilePhotoUrl: profilePhotoUrl.trim() || null,
          emergencyAvailable,
          notifyEmail,
          notifySms,
          notifyWhatsApp,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({
          kind: "err",
          text:
            data.error === BD_PHONE_INVALID_MSG_BN || data.error === BD_WHATSAPP_INVALID_MSG_BN
              ? data.error
              : data.error ?? "সংরক্ষণ ব্যর্থ।",
        });
        return;
      }
      setMsg({ kind: "ok", text: "প্রোফাইল আপডেট হয়েছে।" });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setLoading(false);
    }
  }

  async function saveAreaPreference(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setPrefLoading(true);
    try {
      const res = await fetch("/api/doctor/me/area-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaIds: prefAreaIds }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "অনুরোধ ব্যর্থ।" });
        return;
      }
      setMsg({
        kind: "ok",
        text: "এলাকার পছন্দ অ্যাডমিনের অনুমোদনের জন্য জমা হয়েছে।",
      });
      router.refresh();
    } catch {
      setMsg({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setPrefLoading(false);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setPwLoading(true);
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    try {
      const res = await fetch("/api/doctor/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "পাসওয়ার্ড পরিবর্তন ব্যর্থ।" });
        return;
      }
      setMsg({ kind: "ok", text: "পাসওয়ার্ড পরিবর্তিত হয়েছে।" });
      e.currentTarget.reset();
    } catch {
      setMsg({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setPwLoading(false);
    }
  }

  const pending = initialDoctor.doctorAreaPreferenceRequests[0];

  return (
      <div className="space-y-5 pb-1">
      {msg ? (
        <div
          role={msg.kind === "err" ? "alert" : "status"}
          className={
            msg.kind === "ok"
              ? "rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200"
              : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200"
          }
        >
          {msg.text}
        </div>
      ) : null}

      <AppCard variant="default" className="!p-3.5 sm:!p-5">
        <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">বর্তমান কাজের এলাকা</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{assignedLabels}</p>
        <p className="mt-2 text-xs text-zinc-500">
          চূড়ান্ত এলাকা শুধু অ্যাডমিন পরিবর্তন করতে পারেন। নিচে আপনার পছন্দ জানাতে পারেন।
        </p>
      </AppCard>

      <AppCard variant="default" className="!p-3.5 sm:!p-5">
        <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">প্রোফাইল ও যোগাযোগ</h2>
        <form className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4" onSubmit={saveProfile}>
          <div>
            <label className="block text-sm font-medium text-zinc-800">নাম</label>
            <input
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
              className="mt-1 min-h-[48px] w-full max-w-full rounded-xl border border-zinc-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">মোবাইল</label>
            <input
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              required
              className="mt-1 min-h-[48px] w-full max-w-full rounded-xl border border-zinc-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">হোয়াটসঅ্যাপ</label>
            <input
              value={whatsapp}
              onChange={(ev) => setWhatsapp(ev.target.value)}
              className="mt-1 min-h-[48px] w-full max-w-full rounded-xl border border-zinc-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
              placeholder="ঐচ্ছিক"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">ইমেইল</label>
            <input
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="mt-1 min-h-[48px] w-full max-w-full rounded-xl border border-zinc-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
              placeholder="লগইনের জন্য ইমেইল"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">যোগ্যতা</label>
            <input
              value={qualification}
              onChange={(ev) => setQualification(ev.target.value)}
              className="mt-1 min-h-[48px] w-full max-w-full rounded-xl border border-zinc-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">অভিজ্ঞতা</label>
            <textarea
              value={experienceSummary}
              onChange={(ev) => setExperienceSummary(ev.target.value)}
              rows={3}
              className="mt-1 w-full max-w-full resize-y rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">সংক্ষিপ্ত বায়ো</label>
            <textarea
              value={shortBio}
              onChange={(ev) => setShortBio(ev.target.value)}
              rows={3}
              className="mt-1 w-full max-w-full resize-y rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">প্রোফাইল ছবির লিংক (HTTPS)</label>
            <input
              value={profilePhotoUrl}
              onChange={(ev) => setProfilePhotoUrl(ev.target.value)}
              className="mt-1 min-h-[48px] w-full max-w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">কাজের সময় / উপলভ্যতা টেক্সট</label>
            <textarea
              value={availableTimeText}
              onChange={(ev) => setAvailableTimeText(ev.target.value)}
              rows={2}
              className="mt-1 w-full max-w-full resize-y rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
              placeholder="যেমন: সকাল ৯টা–বিকাল ৬টা"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">উপলভ্যতার অবস্থা</label>
            <select
              value={availabilityStatus}
              onChange={(ev) => setAvailabilityStatus(ev.target.value)}
              className="mt-1 min-h-[48px] w-full max-w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            >
              <option value="AVAILABLE">উপলব্ধ</option>
              <option value="LIMITED">সীমিত</option>
              <option value="OFF">বন্ধ / ছুটি</option>
            </select>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 touch-manipulation">
            <input
              type="checkbox"
              checked={emergencyAvailable}
              onChange={(ev) => setEmergencyAvailable(ev.target.checked)}
              className="size-4 rounded border-zinc-400 text-emerald-600"
            />
            <span className="text-sm text-zinc-800">জরুরি কেসে সহায়তা উপলব্ধ</span>
          </label>

          <fieldset className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
            <legend className="text-sm font-semibold text-zinc-800">নোটিফিকেশন পছন্দ</legend>
            <p className="mt-1 text-xs text-zinc-500">
              ভবিষ্যতে SMS/WhatsApp/ইমেইল ডেলিভারির জন্য সংরক্ষিত।
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(ev) => setNotifyEmail(ev.target.checked)}
                  className="size-4 rounded border-zinc-400 text-emerald-600"
                />
                ইমেইল
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(ev) => setNotifySms(ev.target.checked)}
                  className="size-4 rounded border-zinc-400 text-emerald-600"
                />
                SMS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifyWhatsApp}
                  onChange={(ev) => setNotifyWhatsApp(ev.target.checked)}
                  className="size-4 rounded border-zinc-400 text-emerald-600"
                />
                WhatsApp
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 touch-manipulation sm:w-auto"
          >
            {loading ? "সংরক্ষণ…" : "প্রোফাইল সংরক্ষণ"}
          </button>
        </form>
      </AppCard>

      <AppCard variant="default" className="!p-3.5 sm:!p-5">
        <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">এলাকার পছন্দ (অ্যাডমিন অনুমোদন)</h2>
        {pending ? (
          <p className="mt-2 text-xs text-amber-800">
            একটি অনুরোধ অপেক্ষমান — আপডেট করলে পুরনো অনুরোধ প্রতিস্থাপিত হবে।
          </p>
        ) : null}
        {areasError ? (
          <p className="mt-2 text-sm text-red-700">{areasError}</p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={saveAreaPreference}>
            <SearchableAreaMultiSelect
              areas={areas}
              value={prefAreaIds}
              onChange={setPrefAreaIds}
              label="পছন্দের এলাকা"
            />
            <button
              type="submit"
              disabled={prefLoading || areas.length === 0}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-emerald-600 bg-emerald-50 px-5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 touch-manipulation sm:w-auto"
            >
              {prefLoading ? "পাঠানো হচ্ছে…" : "পছন্দ জমা দিন"}
            </button>
          </form>
        )}
      </AppCard>

      <AppCard variant="default" className="!p-3.5 sm:!p-5">
        <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">পাসওয়ার্ড পরিবর্তন</h2>
        <form className="mt-4 space-y-4" onSubmit={savePassword}>
          <div>
            <label className="block text-sm font-medium text-zinc-800">বর্তমান পাসওয়ার্ড</label>
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
              className="mt-1 min-h-[48px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">নতুন পাসওয়ার্ড</label>
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={8}
              className="mt-1 min-h-[48px] w-full rounded-xl border border-zinc-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 touch-manipulation sm:w-auto"
          >
            {pwLoading ? "আপডেট…" : "পাসওয়ার্ড আপডেট"}
          </button>
        </form>
      </AppCard>

      <AppCard variant="default" className="!p-3.5 sm:!p-5 border-red-200/70 bg-red-50/35">
        <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">লগআউট</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          লগআউট করলে এই ব্রাউজারে আপনার লগইন সেশন বন্ধ হবে।
        </p>
        <a
          href="/api/doctor/logout"
          className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-900 hover:bg-red-50 touch-manipulation sm:w-auto"
        >
          লগআউট
        </a>
      </AppCard>
    </div>
  );
}
