const BN = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Western digits → Bengali numerals for display (pagination, counts, etc.). */
export function toBengaliDigits(input: number | string): string {
  return String(input).replace(/\d/g, (d) => {
    const n = parseInt(d, 10);
    return BN[n] ?? d;
  });
}

/** e.g. মোট ২টি লিড · পৃষ্ঠা ১/৩ */
export function leadCountPageSummaryBn(
  totalCount: number,
  page: number,
  totalPages: number,
): string {
  return `মোট ${toBengaliDigits(totalCount)}টি লিড · পৃষ্ঠা ${toBengaliDigits(page)}/${toBengaliDigits(totalPages)}`;
}
