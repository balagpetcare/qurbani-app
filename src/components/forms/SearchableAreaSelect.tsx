"use client";

import { useId, useMemo, useState } from "react";

export type AreaOption = {
  id: number;
  name: string;
  nameBn: string | null;
};

type Props = {
  areas: AreaOption[];
  name: string;
  id?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Controlled: pass value + onChange for external state */
  value?: number | "";
  onChange?: (areaId: number | "") => void;
  /** Inline validation */
  error?: string;
  errorId?: string;
  /** Optional helper under label */
  hint?: string;
};

export function SearchableAreaSelect({
  areas,
  name,
  id: idProp,
  label,
  required,
  disabled,
  placeholder = "খুঁজে এলাকা বেছে নিন…",
  value: controlledValue,
  onChange,
  error,
  errorId,
  hint,
}: Props) {
  const uid = useId();
  const inputId = idProp ?? `area-search-${uid}`;
  const listId = `${inputId}-list`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [internalId, setInternalId] = useState<number | "">("");

  const selectedId = controlledValue !== undefined ? controlledValue : internalId;

  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedId),
    [areas, selectedId],
  );

  const displayLabel = selectedArea
    ? selectedArea.nameBn
      ? `${selectedArea.name} (${selectedArea.nameBn})`
      : selectedArea.name
    : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => {
      const en = a.name.toLowerCase();
      const bn = (a.nameBn ?? "").toLowerCase();
      return en.includes(q) || bn.includes(q) || String(a.id) === q;
    });
  }, [areas, query]);

  function pick(id: number) {
    if (onChange) onChange(id);
    else setInternalId(id);
    const a = areas.find((x) => x.id === id);
    setQuery(a ? (a.nameBn ? `${a.name} (${a.nameBn})` : a.name) : "");
    setOpen(false);
  }

  function clear() {
    if (onChange) onChange("");
    else setInternalId("");
    setQuery("");
  }

  const invalid = Boolean(error);
  const describedBy =
    [hint ? `${inputId}-hint` : null, error && errorId ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="relative">
      <label htmlFor={inputId} className="block text-base font-semibold text-zinc-900">
        {label}{" "}
        {required ? (
          <span className="text-red-600" aria-hidden>
            *
          </span>
        ) : (
          <span className="font-normal text-zinc-500">(ঐচ্ছিক)</span>
        )}
      </label>
      {hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-sm leading-relaxed text-zinc-500">
          {hint}
        </p>
      ) : null}
      <div className="relative mt-2">
        <input type="hidden" name={name} value={selectedId === "" ? "" : String(selectedId)} />

        <div className="relative">
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            disabled={Boolean(disabled)}
            placeholder={areas.length === 0 ? "এলাকা লোড হচ্ছে…" : placeholder}
            value={open ? query : displayLabel}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150);
            }}
            className={`w-full min-h-[52px] rounded-xl border px-4 py-3 text-lg text-zinc-900 outline-none transition focus:ring-2 disabled:bg-zinc-100 ${
              invalid
                ? "border-red-500 ring-2 ring-red-200 focus:border-red-600 focus:ring-red-200"
                : "border-zinc-300 ring-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/30"
            }`}
          />
          {selectedId !== "" && !required ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => clear()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
            >
              সাফ
            </button>
          ) : null}

          {open && !disabled && areas.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-[60] mt-1 max-h-52 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500">কোনো মিল নেই</li>
              ) : (
                filtered.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedId === a.id}
                      className="w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-emerald-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(a.id)}
                    >
                      {a.nameBn ? `${a.name} (${a.nameBn})` : a.name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>

        {error && errorId ? (
          <p id={errorId} className="mt-2 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
