const FAQ: { q: string; a: string }[] = [
  {
    q: "কত দ্রুত যোগাযোগ করা হবে?",
    a: "ফর্ম জমা দেওয়ার পর আপনার এলাকার ডাক্তার বা আমাদের টিম দ্রুত আপনার সাথে যোগাযোগ করবে। ব্যস্ততা ও এলাকার উপর নির্ভর করে সময় লাগতে পারে; জরুরি মনে হলে ফর্মে উল্লেখ করুন।",
  },
  {
    q: "কোন কোন পশুর জন্য সেবা পাওয়া যাবে?",
    a: "কোরবানির গরু–ছাগলসহ গবাদিপশুর সাধারণ সমস্যায় সরাসরি চিকিৎসা ও পরামর্শ। প্রয়োজনে ক্লিনিক বা অন্য বিশেষজ্ঞের পরামর্শও দেওয়া হতে পারে।",
  },
  {
    q: "কোন এলাকায় সেবা পাওয়া যাবে?",
    a: "ঢাকা ও পার্শ্ববর্তী এলাকায় কার্যক্রম চলে। হোমপেজ ও ফর্মে এলাকা নির্বাচন করুন।",
  },
  {
    q: "ভিজিট ফি কীভাবে জানব?",
    a: "কার্ডে থাকলে আনুমানিক সীমা দেখতে পারেন। চূড়ান্ত ফি ভিজিটের ধরন ও দূরত্ব অনুযায়ী হয়; যোগাযোগের পর স্পষ্ট করে জানানো হবে।",
  },
  {
    q: "ডাক্তার কখন আসবেন?",
    a: "পাবলিক পেজে ডাক্তারের ব্যক্তিগত ফোন বা WhatsApp দেখানো হয় না। ডাক্তার চূড়ান্ত হলে তিনি আপনার দেওয়া নম্বরে কল করে সময় নির্ধারণ করবেন।",
  },
  {
    q: "জরুরি ক্ষেত্রে কী করব?",
    a: "প্রথমে নিরাপদ ব্যবস্থা নিন। আমাদের হেল্পলাইন বা ফর্ম ব্যবহার করুন। খুব গুরুতর অবস্থায় নিকটস্থ ভেটেরিনারি ক্লিনিকের পরামর্শও নিতে পারেন।",
  },
];

export function FaqSection() {
  return (
    <section className="bg-[#f7faf8] py-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl px-1 sm:px-2">
        <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
          প্রায়শই জিজ্ঞাসা
        </h2>
        <div className="mt-6 space-y-3 sm:mt-8">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group min-h-0 min-w-0 max-w-full rounded-2xl border border-zinc-200/90 bg-white px-0 shadow-sm ring-1 ring-emerald-100/25 open:border-emerald-200 open:shadow-md"
            >
              <summary className="cursor-pointer list-none px-4 py-4 text-base font-semibold leading-snug text-zinc-900 marker:content-none sm:px-5 sm:text-lg [&::-webkit-details-marker]:hidden">
                <span className="flex min-h-[44px] items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 text-pretty">{item.q}</span>
                  <span className="mt-0.5 shrink-0 text-emerald-600 transition group-open:rotate-180">
                    ▼
                  </span>
                </span>
              </summary>
              <p className="border-t border-zinc-100 px-4 pb-4 pt-3 text-base leading-relaxed text-zinc-600 sm:px-5 sm:pb-5">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
