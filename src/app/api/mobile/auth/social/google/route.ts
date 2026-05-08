import { postMobileCustomerSocial } from "@/lib/mobile-customer-social-post";

/** Same as `POST /api/mobile/auth/social` with provider fixed to Google. */
export async function POST(request: Request) {
  return postMobileCustomerSocial(request, "GOOGLE");
}
