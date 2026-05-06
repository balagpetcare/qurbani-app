/** Read standard UTM params from a URLSearchParams (e.g. current page query). */
export function utmPayloadFromSearchParams(search: string): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  utmArea?: string;
} {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const pick = (key: string) => {
    const v = p.get(key);
    return v && v.trim() ? v.trim() : undefined;
  };
  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmContent: pick("utm_content"),
    utmTerm: pick("utm_term"),
    utmArea: pick("utm_area"),
  };
}
