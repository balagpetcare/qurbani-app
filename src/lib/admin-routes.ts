/** Canonical admin list path for customer leads (requests). */
export const ADMIN_REQUESTS_PATH = "/admin/requests";

/** Lead detail remains under /admin/leads/[id]. */
export function adminLeadDetailPath(id: number): string {
  return `/admin/leads/${id}`;
}

/** Admin doctor-wise billing / commission report (list). */
export const ADMIN_DOCTOR_FINANCE_PATH = "/admin/doctor-finance";

export function adminDoctorFinanceDetailPath(doctorUserId: number): string {
  return `/admin/doctor-finance/${doctorUserId}`;
}
