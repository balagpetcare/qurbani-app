const ITEMS: string[] = [
  "চোখ উজ্জ্বল ও স্বাভাবিক — ঝাপসা নয়",
  "শ্বাস–প্রশ্বাস স্বাভাবিক, শ্বাসকষ্ট নয়",
  "অতিরিক্ত লালা বা মুখ দিয়ে ঝরা নয়",
  "পেট অস্বাভাবিক ফাঁপা বা ব্লোটেড মনে হচ্ছে না",
  "হাঁটা–চলা স্বাভাবিক",
  "খাওয়া–দাওয়া সক্রিয়",
  "দেহে খোলা ক্ষত বা সংক্রমণের চিহ্ন নেই",
  "সন্দেহজনক ফ্যাটেনিং ইনজেকশন/স্টেরয়েডের লক্ষণ এড়িয়ে চলুন",
];

export function PreQurbaniChecklistSection() {
  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">
          কোরবানির পশু কেনার আগে — দ্রুত চেকলিস্ট
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-zinc-600 sm:text-base">
          বাজার বা খামারে কেনার সময় নিচের বিষয়গুলো দেখে নিন। সন্দেহ থাকলে ফর্ম বা কলে
          জানান — আমরা গাইড করব।
        </p>
        <ul className="mt-8 space-y-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:p-6">
          {ITEMS.map((text) => (
            <li
              key={text}
              className="flex gap-3 text-sm leading-relaxed text-zinc-800 sm:text-base"
            >
              <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white"
                aria-hidden
              >
                ✓
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
