import type { LandingAreaChip } from "@/lib/landing-public-data";

const STATIC_FALLBACK: string[] = [
  "Mirpur",
  "Uttara",
  "Rampura",
  "Badda",
  "Gulshan",
  "Banani",
  "Mohammadpur",
  "Jatrabari",
  "Keraniganj",
  "Savar nearby",
];

type Props = {
  /** When empty, shows static fallback list (API/DB unavailable). */
  areasFromDb: LandingAreaChip[];
};

export function AreaCoverageSection({ areasFromDb }: Props) {
  const useDb = areasFromDb.length > 0;
  const labels = useDb
    ? areasFromDb.map((a) => a.nameBn?.trim() || a.name)
    : STATIC_FALLBACK;

  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">
          সেবার এলাকা
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 sm:text-base">
          {useDb
            ? "ডাটাবেজ থেকে সক্রিয় এলাকার তালিকা (ফর্মের নির্বাচনের সাথে মিলিয়ে নিন)।"
            : "ডাটাবেজ লোড করা যায়নি — সাধারণ এলাকার উদাহরণ দেখানো হচ্ছে। ফর্মে নির্বাচনযোগ্য তালিকা আলাদাভাবে লোড হয়।"}
        </p>
        {!useDb ? (
          <p
            className="mx-auto mt-4 max-w-xl rounded-lg bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 ring-1 ring-amber-200"
            role="status"
          >
            এলাকার তালিকা সার্ভার থেকে আসেনি — নিচের চিপগুলো শুধু নির্দেশিকা।
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
          {labels.map((a) => (
            <span
              key={a}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800"
            >
              {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
