import { Suspense } from "react";

import { AdminLoginClient } from "./AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4 text-center text-sm text-q-muted">
          লোড হচ্ছে…
        </div>
      }
    >
      <AdminLoginClient />
    </Suspense>
  );
}
