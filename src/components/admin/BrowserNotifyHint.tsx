"use client";

import { useCallback, useState } from "react";

/**
 * Optional browser Notification API — user must click to request permission.
 * Does not send remote pushes; prepares for future desktop alerts when delivery is wired.
 */
export function BrowserNotifyHint() {
  const [msg, setMsg] = useState<string | null>(null);

  const enable = useCallback(async () => {
    setMsg(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMsg("এই ব্রাউজারে নোটিফিকেশন API নেই।");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setMsg("ডেস্কটপ নোটিফিকেশন অনুমোদিত। ভবিষ্যতে ইন-অ্যাপ ইভেন্টের সাথে যুক্ত করা যাবে।");
    } else if (perm === "denied") {
      setMsg("নোটিফিকেশন ব্লক করা আছে। ব্রাউজার সেটিং থেকে অনুমতি দিন।");
    } else {
      setMsg("অনুমতি দেওয়া হয়নি।");
    }
  }, []);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
      <p className="font-medium text-zinc-900">ডেস্কটপ অ্যালার্ট (ঐচ্ছিক)</p>
      <p className="mt-1 text-xs text-zinc-600">
        ভবিষ্যৎ রিলিজে ইন-অ্যাপ ঘটনার সাথে ব্রাউজার নোটিফিকেশন যুক্ত করতে এখানে অনুমতি দিতে পারেন।
      </p>
      <button
        type="button"
        onClick={() => void enable()}
        className="mt-2 min-h-[44px] w-full max-w-xs rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 sm:w-auto touch-manipulation"
      >
        অনুমতি চাওয়া
      </button>
      {msg ? <p className="mt-2 text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
