import Link from "next/link";

import type { PublicDoctorCard } from "@/lib/public-doctor";

import { landingBtnOutlineEmerald, landingBtnSolidEmerald } from "./landing-button-classes";
import { LANDING_REQUEST_PATH } from "./landing-contact";

type Props = {
  doctors: PublicDoctorCard[];
};

export function DoctorPreviewSection({ doctors }: Props) {
  const empty = doctors.length === 0;

  return (
    <section className="border-b border-emerald-100/60 bg-[#fafdfb] py-8 sm:py-10">
      <div className="mx-auto w-full min-w-0 max-w-3xl px-2 sm:px-3">
        <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
          আমাদের ডাক্তার দল
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base leading-relaxed text-zinc-700">
          এলাকা, অভিজ্ঞতা ও প্রয়োজন অনুযায়ী আমরা আপনার জন্য উপযুক্ত ডাক্তার খুঁজে দিতে সাহায্য করি।
        </p>

        {empty ? (
          <p className="mx-auto mt-8 max-w-lg rounded-2xl border border-dashed border-zinc-300 bg-white p-5 text-center text-base leading-relaxed text-zinc-600 sm:rounded-3xl sm:p-6">
            এখনও প্রদর্শনযোগ্য ডাক্তার যুক্ত হয়নি।{" "}
            <Link href={LANDING_REQUEST_PATH} className="font-semibold text-emerald-700 underline">
              চিকিৎসার ফর্ম
            </Link>{" "}
            ব্যবহার করুন।
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {doctors.map((d) => (
              <li
                key={d.id}
                className="flex min-w-0 flex-col rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-md ring-1 ring-emerald-100/35 sm:rounded-3xl"
              >
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  {d.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- doctor URLs may be arbitrary external storage
                    <img
                      src={d.profilePhotoUrl}
                      alt={`ডাঃ ${d.name}`}
                      className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 sm:h-[4.5rem] sm:w-[4.5rem]"
                    />
                  ) : (
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800 ring-1 ring-emerald-200/60 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl"
                      aria-hidden
                    >
                      {d.name.trim().charAt(0) || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold leading-snug text-zinc-900 sm:text-lg">
                      ডাঃ {d.name}
                    </p>
                    {d.qualification ? (
                      <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{d.qualification}</p>
                    ) : null}
                    <p className="mt-1 text-sm leading-relaxed text-emerald-900 sm:text-base">
                      <span className="font-medium text-zinc-600">এলাকা: </span>
                      {d.areaLabel}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold leading-snug text-emerald-950 sm:text-base">
                      {d.feeLineBn}
                    </p>
                    {d.feeNote ? (
                      <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">{d.feeNote}</p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-base leading-relaxed text-zinc-600">{d.experienceBlurb}</p>
                {d.shortBio ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-500">{d.shortBio}</p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  সম্পন্ন চিকিৎসা:{" "}
                  <span className="font-semibold tabular-nums text-zinc-800">
                    {d.completedCount.toLocaleString("bn-BD")}
                  </span>
                </p>
                <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-3">
                  <Link
                    href={LANDING_REQUEST_PATH}
                    className={`touch-manipulation break-words ${landingBtnSolidEmerald}`}
                  >
                    চিকিৎসার জন্য জানান
                  </Link>
                  <Link
                    href={`/doctors/${d.id}`}
                    className={`touch-manipulation break-words ${landingBtnOutlineEmerald}`}
                  >
                    ডাক্তারের তথ্য দেখুন
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
