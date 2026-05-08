import { postMobileCustomerSocial } from "@/lib/mobile-customer-social-post";

/** Same as `POST /api/mobile/auth/social` with provider fixed to Facebook. */
export async function POST(request: Request) {
  return postMobileCustomerSocial(request, "FACEBOOK");
}
