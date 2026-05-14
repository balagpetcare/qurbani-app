import type { AuthTokenPayload } from "@/lib/auth-token";

export const DOCTOR_LOGIN_PATH = "/doctor/login";

/**
 * Edge middleware + client: valid doctor JWT → skip login UI (honours safe `?from=`).
 */
export function doctorAuthenticatedLoginRedirectTarget(
  pathname: string,
  payload: AuthTokenPayload | null,
  fromQuery: string | null,
): string | null {
  if (pathname !== DOCTOR_LOGIN_PATH) return null;
  if (payload?.role !== "DOCTOR") return null;
  return resolveDoctorPostLoginHref(fromQuery);
}

/**
 * After password login: honor safe internal doctor URLs from ?from=, else dashboard.
 */
function isSafeDoctorPostLoginPath(fromQuery: string): boolean {
  if (
    typeof fromQuery === "string" &&
    fromQuery.startsWith("/") &&
    !fromQuery.startsWith("//")
  ) {
    if (
      fromQuery.startsWith("/doctor") &&
      !fromQuery.startsWith("/doctor/login") &&
      !fromQuery.startsWith("/doctor/apply")
    ) {
      return true;
    }
    if (fromQuery.startsWith("/accept-lead/")) {
      return true;
    }
  }
  return false;
}

export function resolveDoctorPostLoginHref(fromQuery: string | null): string {
  if (isSafeDoctorPostLoginPath(fromQuery ?? "")) {
    return fromQuery as string;
  }
  return "/doctor";
}
