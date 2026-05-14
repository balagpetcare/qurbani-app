import { HomeAreaSearchClient } from "@/components/landing/home/HomeAreaSearchClient";
import type { LandingAreaChip } from "@/lib/landing-public-data";

type Props = {
  areas: LandingAreaChip[];
  leadFormEnabled: boolean;
};

export function HomeAreaSearchSection({ areas, leadFormEnabled }: Props) {
  return (
    <section className="border-b border-emerald-100/60 bg-white py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        <h2 className="text-center text-lg font-bold text-zinc-900 sm:text-xl">এলাকা অনুসারে সেবা</h2>
        <p className="mx-auto mt-1 max-w-md text-pretty text-center text-sm text-zinc-600">
          এলাকা বাছাই করুন — দ্রুত মিলিয়ে ডাক্তার যোগাযোগের ব্যবস্থা করা হয়।
        </p>
        <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-emerald-100/80 bg-[#fafdfb] p-4 shadow-sm ring-1 ring-emerald-50 sm:p-5">
          <HomeAreaSearchClient areas={areas} leadFormEnabled={leadFormEnabled} />
        </div>
      </div>
    </section>
  );
}
