/** Slugs accepted from public lead form / API (aligned with landing problem cards). */
export const LEAD_PROBLEM_CATEGORIES = [
  { slug: "fever-not-eating", labelBn: "জ্বর / খাওয়া বন্ধ" },
  { slug: "bloat-gas", labelBn: "ফাঁপা পেট / গ্যাস" },
  { slug: "diarrhea", labelBn: "পাতলা পায়খানা" },
  { slug: "cough-breathing", labelBn: "কাশি / শ্বাসকষ্ট" },
  { slug: "wound-injury", labelBn: "ক্ষত / আঘাত" },
  { slug: "saliva-mouth", labelBn: "বেশি লালা / মুখের ঘা" },
  { slug: "leg-swelling", labelBn: "পা ফোলা / খোঁড়া" },
  { slug: "emergency-weak", labelBn: "জরুরি দুর্বলতা" },
  { slug: "other", labelBn: "অন্যান্য" },
] as const;

export const LEAD_PROBLEM_CATEGORY_SLUGS: Set<string> = new Set(
  LEAD_PROBLEM_CATEGORIES.map((c) => c.slug),
);

export function problemCategoryLabelBn(slug: string | null | undefined): string {
  if (!slug) return "—";
  const row = LEAD_PROBLEM_CATEGORIES.find((c) => c.slug === slug);
  return row?.labelBn ?? slug;
}
