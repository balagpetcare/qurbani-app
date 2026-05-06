"use client";

import { FormEvent, useMemo, useState } from "react";

import { SITE_SETTING_KEYS, SITE_SETTING_SEED_ROWS } from "@/lib/site-setting-registry";
import type { SiteSettingRowView } from "@/lib/site-settings";

const GROUP_LABELS: Record<string, string> = {
  website: "ওয়েবসাইট",
  contact: "যোগাযোগ ও লিংক",
  leads: "লিড / অনুরোধ",
  applications: "ডাক্তার আবেদন",
  notifications: "নোটিফিকেশন",
  seo: "SEO ও মার্কেটিং",
  system: "সিস্টেম",
};

function buildValues(rows: SiteSettingRowView[]): Record<string, string | boolean> {
  const v: Record<string, string | boolean> = {};
  for (const r of rows) {
    if (typeof r.value === "boolean") {
      v[r.key] = r.value;
    } else if (typeof r.value === "string") {
      v[r.key] = r.value;
    } else if (typeof r.value === "number") {
      v[r.key] = String(r.value);
    } else {
      v[r.key] = "";
    }
  }
  return v;
}

const CONTACT_DIGIT_HINT_KEYS = new Set<string>([
  SITE_SETTING_KEYS.CONTACT_PHONE_CALL,
  SITE_SETTING_KEYS.CONTACT_WHATSAPP,
  SITE_SETTING_KEYS.CONTACT_EMERGENCY,
]);

type Props = {
  initialRows: SiteSettingRowView[];
};

export function AdminSettingsForm({ initialRows }: Props) {
  const [values, setValues] = useState(() => buildValues(initialRows));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const grouped = useMemo(() => {
    const g = new Map<string, SiteSettingRowView[]>();
    for (const r of initialRows) {
      const arr = g.get(r.group) ?? [];
      arr.push(r);
      g.set(r.group, arr);
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [initialRows]);

  function setField(key: string, next: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: next }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const updates: Record<string, unknown> = {};
    for (const row of initialRows) {
      const cur = values[row.key];
      updates[row.key] = cur;
    }
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? "সংরক্ষণ ব্যর্থ।" });
        return;
      }
      setMsg({ kind: "ok", text: "সেটিংস সংরক্ষিত হয়েছে।" });
    } catch {
      setMsg({ kind: "err", text: "নেটওয়ার্ক ত্রুটি।" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full min-w-0 space-y-10"
    >
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

      {grouped.map(([groupKey, rows]) => (
        <section
          key={groupKey}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-base font-semibold text-zinc-900">
            {GROUP_LABELS[groupKey] ?? groupKey}
          </h2>
          <div className="mt-5 space-y-5">
            {rows.map((row) => {
              const id = `set-${row.key.replace(/\./g, "-")}`;
              const val = values[row.key];
              const seedDef = SITE_SETTING_SEED_ROWS.find((s) => s.key === row.key);
              const isBool = typeof seedDef?.value === "boolean";

              return (
                <div key={row.key} className="min-w-0 space-y-1.5">
                  <label htmlFor={id} className="block text-sm font-medium text-zinc-800">
                    {row.label}
                  </label>
                  {row.description ? (
                    <p className="text-xs leading-relaxed text-zinc-500">{row.description}</p>
                  ) : null}
                  {isBool ? (
                    <label className="flex min-h-[44px] max-w-full cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 touch-manipulation">
                      <input
                        id={id}
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500"
                        checked={Boolean(val)}
                        onChange={(ev) => setField(row.key, ev.target.checked)}
                      />
                      <span className="text-sm text-zinc-700">
                        {Boolean(val) ? "চালু" : "বন্ধ"}
                      </span>
                    </label>
                  ) : (
                    <textarea
                      id={id}
                      rows={
                        row.key.includes("address") ||
                        row.key.includes("subtitle") ||
                        row.key.includes("message") ||
                        row.key.includes("description")
                          ? 3
                          : 2
                      }
                      className="mt-1 w-full max-w-full min-w-0 resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/25 focus:border-emerald-500 focus:ring-2"
                      value={typeof val === "string" ? val : ""}
                      onChange={(ev) => setField(row.key, ev.target.value)}
                    />
                  )}
                  {!isBool && CONTACT_DIGIT_HINT_KEYS.has(row.key) ? (
                    <p className="text-xs text-zinc-500">
                      ০১…, +৮৮০…, ৮৮০… বা ফাঁকা/হাইফেনসহ লিখলেও সংরক্ষণে ৮৮০১… ফরম্যাট হবে। খালি
                      রাখবেন না।
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 z-10 border-t border-zinc-200 bg-zinc-50/95 py-4 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 touch-manipulation sm:w-auto"
        >
          {loading ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
        </button>
      </div>
    </form>
  );
}
