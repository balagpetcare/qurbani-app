import Link from "next/link";

/** পাবলিক সাইট বন্ধ — শুধু বার্তা (সেটিংস থেকে নয়, নিরাপদ ডিফল্ট কপি) */
export function PublicSiteDisabledMessage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-50 px-4 py-16 text-center text-zinc-900">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold leading-snug">সাইট সাময়িকভাবে বন্ধ</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600">
          আমরা শীঘ্রই ফিরে আসব। জরুরি প্রয়োজনে অ্যাডমিনের সাথে সরাসরি যোগাযোগ করুন।
        </p>
        <p className="mt-6">
          <Link
            href="/doctor/login"
            className="text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2"
          >
            ডাক্তার লগইন →
          </Link>
        </p>
      </div>
    </div>
  );
}

/** মেইনটেন্যান্স মোড — পাবলিক হোম */
export function MaintenanceModeMessage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-amber-50/80 px-4 py-16 text-center text-amber-950">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold leading-snug">সাইট আপডেট হচ্ছে</h1>
        <p className="mt-4 text-sm leading-relaxed text-amber-900/90">
          কিছুক্ষণ পর আবার চেষ্টা করুন। প্রয়োজনে WhatsApp বা কলের মাধ্যমে যোগাযোগ করুন।
        </p>
        <p className="mt-6">
          <Link
            href="/doctor/login"
            className="text-sm font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2"
          >
            ডাক্তার লগইন →
          </Link>
        </p>
      </div>
    </div>
  );
}
