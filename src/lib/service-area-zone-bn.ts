import { ServiceAreaZone } from "@/generated/prisma/enums";

const ZONE_BN: Record<ServiceAreaZone, string> = {
  NORTH_DHAKA: "ঢাকা — উত্তর",
  CENTRAL_DHAKA: "ঢাকা — কেন্দ্র",
  OLD_DHAKA: "ঢাকা — পুরনো ঢাকা",
  SOUTH_DHAKA: "ঢাকা — দক্ষিণ",
  WEST_DHAKA: "ঢাকা — পশ্চিম",
  OUTSIDE_DHAKA: "ঢাকার বাইরে (সার্বিক)",
};

export function serviceAreaZoneToBn(zone: ServiceAreaZone | null | undefined): string {
  if (!zone) return "এলাকা নির্ধারিত নয়";
  return ZONE_BN[zone] ?? "ঢাকা অঞ্চল";
}
