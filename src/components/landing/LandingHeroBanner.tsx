import Image from "next/image";

const HERO_SRC = "/images/qurbani-2026-hero.png";

/**
 * First visual on the public landing: full-bleed within `<main>` padding, responsive, no horizontal scroll.
 */
export function LandingHeroBanner() {
  return (
    <div className="-mx-4 w-[calc(100%+2rem)] min-w-0 max-w-none shrink-0 sm:-mx-5 sm:w-[calc(100%+2.5rem)]">
      <div className="overflow-hidden rounded-b-3xl bg-gradient-to-b from-white via-[#f6fbf8] to-[#eef5f1] ring-1 ring-emerald-900/10 shadow-[0_8px_30px_-12px_rgba(13,104,69,0.15)]">
        <div className="flex w-full min-w-0 justify-center px-2 pt-2 pb-1 sm:px-4 sm:pt-3 sm:pb-2">
          <Image
            src={HERO_SRC}
            alt="Qurbani 2026 জরুরি পশু চিকিৎসা সেবা"
            width={960}
            height={320}
            priority
            className="h-auto w-full max-w-full object-contain object-center max-h-[min(56vw,320px)] min-h-[120px] sm:max-h-[min(44vw,380px)] md:max-h-[min(420px,42vh)]"
            sizes="(max-width: 768px) 100vw, min(960px, 96vw)"
          />
        </div>
      </div>
    </div>
  );
}
