"use client";

import { useId, useMemo, useState } from "react";

import type { AreaOption } from "@/components/forms/SearchableAreaSelect";

type Props = {
  areas: AreaOption[];
  label: string;
  required?: boolean;
  disabled?: boolean;
  /** Selected area ids */
  value: number[];
  onChange: (ids: number[]) => void;
};

function areaLineLabel(a: AreaOption): string {
  if (a.nameBn?.trim()) return a.nameBn.trim();
  if (a.nameEn?.trim()) return a.nameEn.trim();
  return a.name;
}

export function SearchableAreaMultiSelect({
  areas,
  label,
  required,
  disabled,
  value,
  onChange,
}: Props) {
  const uid = useId();
  const inputId = `area-multi-search-${uid}`;
  const selected = new Set(value);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => {
      const en = a.name.toLowerCase();
      const en2 = (a.nameEn ?? "").toLowerCase();
      const bn = (a.nameBn ?? "").toLowerCase();
      return en.includes(q) || en2.includes(q) || bn.includes(q);
    });
  }, [areas, query]);

  function toggle(id: number) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="relative">
      <span className="block text-sm font-medium text-zinc-800">
        {label}{" "}
        {required ? <span className="text-red-600" aria-hidden>*</span> : null}
      </span>

      <div className="relative mt-1.5">
        <input
          id={inputId}
          type="text"
          disabled={disabled || areas.length === 0}
          placeholder={areas.length === 0 ? "এলাকা লোড হচ্ছে…" : "খুঁজে এলাকা যোগ করুন…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className="min-h-[48px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 disabled:bg-zinc-100"
        />
      </div>

      {open && !disabled && areas.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  toggle(a.id);
                  setQuery("");
                }}
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                    selected.has(a.id)
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-300 bg-white"
                  }`}
                  aria-hidden
                >
                  {selected.has(a.id) ? "✓" : ""}
                </span>
                <span>{areaLineLabel(a)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {value.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {value.map((id) => {
            const a = areas.find((x) => x.id === id);
            if (!a) return null;
            return (
              <li
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200"
              >
                {areaLineLabel(a)}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-emerald-100"
                  onClick={() => onChange(value.filter((x) => x !== id))}
                  aria-label={`Remove ${a.name}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">
          {required ? "কমপক্ষে একটি এলাকা বেছে নিন।" : null}
        </p>
      )}
    </div>
  );
}
