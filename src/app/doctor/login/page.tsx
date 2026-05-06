import { Suspense } from "react";

import { DoctorLoginClient } from "./DoctorLoginClient";

export default function DoctorLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-q-muted">লোড হচ্ছে…</div>}>
      <DoctorLoginClient />
    </Suspense>
  );
}
