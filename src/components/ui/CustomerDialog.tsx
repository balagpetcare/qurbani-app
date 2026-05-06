"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  /** Primary action (e.g. confirm, navigate) */
  primaryLabel: string;
  onPrimary: () => void;
  /** Optional secondary (e.g. cancel) */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Extra footer actions (links, tertiary buttons) */
  footerExtra?: ReactNode;
};

/**
 * Lightweight modal for customer-facing Bengali messages (native `<dialog>`).
 */
export function CustomerDialog({
  open,
  onClose,
  title,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  footerExtra,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) {
        d.showModal();
      }
    } else if (d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="app-customer-dialog fixed left-1/2 top-1/2 z-[100] max-h-[min(88dvh,680px)] w-[calc(100%-1.5rem)] max-w-[min(100%,22rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl sm:max-w-md"
      aria-labelledby={titleId}
      aria-describedby={children ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[min(88dvh,680px)] flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-b border-zinc-100 px-5 pb-4 pt-5">
          <h2 id={titleId} className="text-lg font-bold leading-snug text-zinc-900">
            {title}
          </h2>
          {children ? (
            <div id={descId} className="mt-3 text-[15px] leading-relaxed text-zinc-600 sm:text-base">
              {children}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 flex flex-col gap-2 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="min-h-[52px] w-full touch-manipulation rounded-xl bg-emerald-600 px-4 text-base font-bold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              className="min-h-[48px] w-full touch-manipulation rounded-xl border border-zinc-200 bg-white px-4 text-base font-semibold text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          ) : null}
          {footerExtra ? <div className="mt-1 flex flex-col gap-2">{footerExtra}</div> : null}
        </div>
      </div>
    </dialog>
  );
}
