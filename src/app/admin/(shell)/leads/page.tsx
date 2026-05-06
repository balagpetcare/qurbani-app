import { redirect } from "next/navigation";

import { ADMIN_REQUESTS_PATH } from "@/lib/admin-routes";

/** Legacy URL — canonical list is `/admin/requests`. */
export default function AdminLeadsRedirectPage() {
  redirect(ADMIN_REQUESTS_PATH);
}
