"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { ServiceAreaZone } from "@/generated/prisma/enums";
import { slugifyAreaLabel } from "@/lib/area-slug";

export type AdminAreaListRow = {
  id: number;
  slug: string;
  name: string;
  nameBn: string | null;
  nameEn: string | null;
  zone: ServiceAreaZone | null;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
  note: string | null;
  _count: { doctors: number; leads: number };
};

const ZONE_LABELS: Record<ServiceAreaZone, string> = {
  [ServiceAreaZone.NORTH_DHAKA]: "উত্তর ঢাকা",
  [ServiceAreaZone.CENTRAL_DHAKA]: "কেন্দ্রীয় ঢাকা",
  [ServiceAreaZone.OLD_DHAKA]: "পুরনো ঢাকা",
  [ServiceAreaZone.SOUTH_DHAKA]: "দক্ষিণ ঢাকা",
  [ServiceAreaZone.WEST_DHAKA]: "পশ্চিম ঢাকা",
  [ServiceAreaZone.OUTSIDE_DHAKA]: "ঢাকার বাইরে",
};

const ZONE_VALUES = Object.values(ServiceAreaZone) as ServiceAreaZone[];

type Flash = { kind: "ok" | "err"; text: string } | null;

export function AreasAdminPanel({ initialAreas }: { initialAreas: AdminAreaListRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ServiceAreaZone | "ALL" | "NONE">("ALL");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [flash, setFlash] = useState<Flash>(null);

  const [createBn, setCreateBn] = useState("");
  const [createRoman, setCreateRoman] = useState("");
  const [createEn, setCreateEn] = useState("");
  const [createZone, setCreateZone] = useState<ServiceAreaZone | "">("");
  const [createPopular, setCreatePopular] = useState(false);
  const [createSort, setCreateSort] = useState("0");
  const [createLoading, setCreateLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialAreas.filter((a) => {
      if (activeFilter === "active" && !a.isActive) return false;
      if (activeFilter === "inactive" && a.isActive) return false;
      if (zoneFilter === "NONE" && a.zone != null) return false;
      if (zoneFilter !== "ALL" && zoneFilter !== "NONE" && a.zone !== zoneFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        a.slug,
        a.name,
        a.nameBn ?? "",
        a.nameEn ?? "",
        a.note ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialAreas, query, zoneFilter, activeFilter]);

  async function patchArea(id: number, payload: Record<string, unknown>) {
    setFlash(null);
    const res = await fetch(`/api/admin/areas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; messageBn?: string };
    if (!res.ok) {
      setFlash({
        kind: "err",
        text: data.messageBn ?? data.error ?? "সংরক্ষণ ব্যর্থ।",
      });
      return;
    }
    setFlash({ kind: "ok", text: "সংরক্ষিত।" });
    router.refresh();
  }

  async function removeArea(id: number) {
    const ok = window.confirm(
      "এই এলাকাটি মুছে ফেলতে চান? শুধুমাত্র কোনো লিড/ডাক্তার না থাকলে মুছবে।",
    );
    if (!ok) return;
    setFlash(null);
    const res = await fetch(`/api/admin/areas/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string; messageBn?: string };
    if (!res.ok) {
      setFlash({
        kind: "err",
        text: data.messageBn ?? data.error ?? "মুছে ফেলা যায়নি।",
      });
      return;
    }
    setFlash({ kind: "ok", text: "মুছে ফেলা হয়েছে।" });
    router.refresh();
  }

  async function createArea(e: FormEvent) {
    e.preventDefault();
    const bn = createBn.trim();
    if (!bn) {
      setFlash({ kind: "err", text: "বাংলা নাম লিখুন।" });
      return;
    }
    setCreateLoading(true);
    setFlash(null);
    try {
      const res = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameBn: bn,
          name: createRoman.trim() || undefined,
          nameEn: createEn.trim() || undefined,
          zone: createZone || undefined,
          isPopular: createPopular,
          sortOrder: parseInt(createSort, 10) || 0,
        }),
      });
      const data = (await res.json()) as { error?: string; messageBn?: string };
      if (!res.ok) {
        setFlash({
          kind: "err",
          text: data.messageBn ?? data.error ?? "তৈরি ব্যর্থ।",
        });
        return;
      }
      setFlash({ kind: "ok", text: "নতুন এলাকা যোগ হয়েছে।" });
      setCreateBn("");
      setCreateRoman("");
      setCreateEn("");
      setCreateZone("");
      setCreatePopular(false);
      setCreateSort("0");
      router.refresh();
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {flash ? (
        <div
          role={flash.kind === "err" ? "alert" : "status"}
          className={
            flash.kind === "ok"
              ? "rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200"
              : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200"
          }
        >
          {flash.text}
        </div>
      ) : null}

      <AdminCard>
        <p className="font-bold text-zinc-900">নতুন এলাকা</p>
        <form className="mt-4 space-y-3" onSubmit={(e: FormEvent) => void createArea(e)}>
          <div>
            <label className="block text-xs font-semibold text-zinc-700">নাম (বাংলা) *</label>
            <input
              value={createBn}
              onChange={(e) => setCreateBn(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
              placeholder="যেমন: শ্যামপুর"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                রোমান নাম <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
              </label>
              <input
                value={createRoman}
                onChange={(e) => setCreateRoman(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
                placeholder={`স্বয়ংক্রিয়: ${slugifyAreaLabel(createBn || "area")}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                ইংরেজি নাম <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
              </label>
              <input
                value={createEn}
                onChange={(e) => setCreateEn(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700">জোন</label>
              <select
                value={createZone}
                onChange={(e) =>
                  setCreateZone((e.target.value || "") as ServiceAreaZone | "")
                }
                className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
              >
                <option value="">— নির্বাচন —</option>
                {ZONE_VALUES.map((z) => (
                  <option key={z} value={z}>
                    {ZONE_LABELS[z]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700">সাজানো (sortOrder)</label>
              <input
                type="number"
                value={createSort}
                onChange={(e) => setCreateSort(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
            <input
              type="checkbox"
              checked={createPopular}
              onChange={(e) => setCreatePopular(e.target.checked)}
            />
            জনপ্রিয় এলাকা
          </label>
          <AppButton type="submit" variant="primary" disabled={createLoading} block>
            {createLoading ? "যোগ হচ্ছে…" : "এলাকা যোগ করুন"}
          </AppButton>
        </form>
      </AdminCard>

      <AdminCard>
        <p className="font-bold text-zinc-900">খোঁজ ও ফিল্টার</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700">খোঁজ</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
              placeholder="নাম, স্লাগ, নোট…"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700">জোন</label>
            <select
              value={zoneFilter}
              onChange={(e) =>
                setZoneFilter(e.target.value as ServiceAreaZone | "ALL" | "NONE")
              }
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
            >
              <option value="ALL">সব জোন</option>
              <option value="NONE">জোন ছাড়া</option>
              {ZONE_VALUES.map((z) => (
                <option key={z} value={z}>
                  {ZONE_LABELS[z]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700">স্ট্যাটাস</label>
            <select
              value={activeFilter}
              onChange={(e) =>
                setActiveFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
            >
              <option value="all">সব</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">নিষ্ক্রিয়</option>
            </select>
          </div>
        </div>
      </AdminCard>

      <p className="text-sm text-q-muted">
        দেখাচ্ছে {filtered.length} টি (মোট {initialAreas.length})।
      </p>

      <ul className="space-y-3">
        {filtered.map((a) => (
          <li key={a.id}>
            <AreaEditCard area={a} onPatch={patchArea} onDelete={removeArea} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreaEditCard({
  area,
  onPatch,
  onDelete,
}: {
  area: AdminAreaListRow;
  onPatch: (id: number, payload: Record<string, unknown>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function save(payload: Record<string, unknown>) {
    setLoading(true);
    try {
      await onPatch(area.id, payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminCard>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-zinc-900">{area.nameBn ?? area.name}</p>
          <p className="text-xs text-q-muted">
            {area.nameEn ? `${area.nameEn} · ` : ""}
            {area.name} · <span className="font-mono">{area.slug}</span>
          </p>
          {area.zone ? (
            <p className="mt-1 text-xs font-medium text-emerald-800">
              {ZONE_LABELS[area.zone]}
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">জোন নির্ধারিত নয়</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {area.isActive ? (
            <AppBadge tone="success">সক্রিয়</AppBadge>
          ) : (
            <AppBadge tone="neutral">নিষ্ক্রিয়</AppBadge>
          )}
          {area.isPopular ? <AppBadge tone="warning">জনপ্রিয়</AppBadge> : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-q-muted">ডাক্তার</dt>
          <dd className="font-semibold tabular-nums">{area._count.doctors}</dd>
        </div>
        <div>
          <dt className="text-q-muted">সক্রিয় লিড</dt>
          <dd className="font-semibold tabular-nums">{area._count.leads}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-zinc-700">
          বাংলা নাম
          <input
            key={`bn-${area.id}-${area.nameBn}`}
            defaultValue={area.nameBn ?? ""}
            id={`area-bn-${area.id}`}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-zinc-700">
          রোমান লেবেল
          <input
            key={`nm-${area.id}-${area.name}`}
            defaultValue={area.name}
            id={`area-nm-${area.id}`}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-zinc-700">
          ইংরেজি নাম
          <input
            key={`en-${area.id}-${area.nameEn}`}
            defaultValue={area.nameEn ?? ""}
            id={`area-en-${area.id}`}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-zinc-700">
          জোন
          <select
            key={`zn-${area.id}-${area.zone}`}
            id={`area-zn-${area.id}`}
            defaultValue={area.zone ?? ""}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
          >
            <option value="">— নির্বাচন —</option>
            {ZONE_VALUES.map((z) => (
              <option key={z} value={z}>
                {ZONE_LABELS[z]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-zinc-700">
          সাজানো
          <input
            key={`so-${area.id}-${area.sortOrder}`}
            type="number"
            defaultValue={area.sortOrder}
            id={`area-so-${area.id}`}
            className="mt-1 min-h-[44px] w-full rounded-2xl border border-zinc-200 px-3 text-sm"
          />
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold text-zinc-700">
        নোট (অভ্যন্তরীণ)
        <textarea
          key={`note-${area.id}-${area.note}`}
          defaultValue={area.note ?? ""}
          id={`area-note-${area.id}`}
          rows={2}
          className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <AppButton
          type="button"
          variant="primary"
          disabled={loading}
          onClick={() => {
            const bn = (
              document.getElementById(`area-bn-${area.id}`) as HTMLInputElement | null
            )?.value.trim();
            const nm = (
              document.getElementById(`area-nm-${area.id}`) as HTMLInputElement | null
            )?.value.trim();
            const en = (
              document.getElementById(`area-en-${area.id}`) as HTMLInputElement | null
            )?.value.trim();
            const zn = (
              document.getElementById(`area-zn-${area.id}`) as HTMLSelectElement | null
            )?.value;
            const soRaw = (
              document.getElementById(`area-so-${area.id}`) as HTMLInputElement | null
            )?.value;
            const note = (
              document.getElementById(`area-note-${area.id}`) as HTMLTextAreaElement | null
            )?.value.trim();

            const so = parseInt(soRaw ?? "", 10);

            if (!bn || !nm) {
              window.alert("বাংলা নাম ও রোমান লেবেল খালি রাখা যাবে না।");
              return;
            }

            void save({
              nameBn: bn,
              name: nm,
              nameEn: en || null,
              zone: zn === "" ? null : zn,
              sortOrder: Number.isInteger(so) ? so : area.sortOrder,
              note: note || null,
            });
          }}
        >
          পরিবর্তন সংরক্ষণ
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => void save({ isPopular: !area.isPopular })}
        >
          {area.isPopular ? "জনপ্রিয় বন্ধ করুন" : "জনপ্রিয় চালু করুন"}
        </AppButton>
        <AppButton
          type="button"
          variant={area.isActive ? "ghost" : "secondary"}
          disabled={loading}
          onClick={() => void save({ isActive: !area.isActive })}
        >
          {area.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
        </AppButton>
        <AppButton
          type="button"
          variant="ghost"
          disabled={loading}
          className="text-red-700 ring-red-200 hover:bg-red-50"
          onClick={() => void onDelete(area.id)}
        >
          মুছুন
        </AppButton>
      </div>
    </AdminCard>
  );
}
