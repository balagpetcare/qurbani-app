import { NextResponse } from "next/server";

import {
  isAppleOAuthConfigured,
  isFacebookOAuthConfigured,
  isGoogleOAuthConfigured,
} from "@/lib/social-oidc-verify";

/**
 * Which social providers are configured server-side (no secrets returned).
 * Flutter uses this to show/hide login buttons without baking secrets in the app.
 */
export async function GET() {
  const google = isGoogleOAuthConfigured();
  const facebook = isFacebookOAuthConfigured();
  const apple = isAppleOAuthConfigured();

  return NextResponse.json({
    providers: { google, facebook, apple },
  });
}
