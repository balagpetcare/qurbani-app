/** Canonical admin list path for customer leads (requests). */
export const ADMIN_REQUESTS_PATH = "/admin/requests";

/** Lead detail remains under /admin/leads/[id]. */
export function adminLeadDetailPath(id: number): string {
  return `/admin/leads/${id}`;
}
