import { postMobileCustomerSocial } from "@/lib/mobile-customer-social-post";

/** Unified social login: body includes `{ "provider": "GOOGLE"|"FACEBOOK"|"APPLE", ... }`. */
export async function POST(request: Request) {
  return postMobileCustomerSocial(request, null);
}
