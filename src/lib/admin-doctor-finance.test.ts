import { describe, expect, it } from "vitest";

import {
  buildAdminDoctorFinanceBillingWhere,
  parseAdminDoctorFinanceParams,
  serializeAdminDoctorFinanceQuery,
} from "@/lib/admin-doctor-finance-query";
import { TreatmentCompletionStatus } from "@/generated/prisma/enums";

describe("parseAdminDoctorFinanceParams", () => {
  it("defaults closure to completed_only", () => {
    const q = parseAdminDoctorFinanceParams({});
    expect(q.closure).toBe("completed_only");
    expect(q.page).toBe(1);
    expect(q.limit).toBe(30);
  });

  it("parses closure=all", () => {
    const q = parseAdminDoctorFinanceParams({ closure: "all" });
    expect(q.closure).toBe("all_closures");
  });

  it("parses dates and ids", () => {
    const q = parseAdminDoctorFinanceParams({
      from: "2026-01-15",
      to: "2026-01-20",
      doctorId: "12",
      areaId: "3",
      search: " রহিম ",
      page: "2",
      limit: "50",
    });
    expect(q.from?.toISOString().startsWith("2026-01-15")).toBe(true);
    expect(q.to?.toISOString().startsWith("2026-01-20")).toBe(true);
    expect(q.doctorId).toBe(12);
    expect(q.areaId).toBe(3);
    expect(q.search).toBe("রহিম");
    expect(q.page).toBe(2);
    expect(q.limit).toBe(50);
  });

  it("caps limit at 100", () => {
    const q = parseAdminDoctorFinanceParams({ limit: "500" });
    expect(q.limit).toBe(100);
  });
});

describe("buildAdminDoctorFinanceBillingWhere", () => {
  it("filters COMPLETED by default", () => {
    const q = parseAdminDoctorFinanceParams({});
    const w = buildAdminDoctorFinanceBillingWhere(q, undefined);
    expect(w.status).toBe(TreatmentCompletionStatus.COMPLETED);
  });

  it("omits status when all closures", () => {
    const q = parseAdminDoctorFinanceParams({ closure: "all" });
    const w = buildAdminDoctorFinanceBillingWhere(q, undefined);
    expect(w.status).toBeUndefined();
  });

  it("scopes doctor ids", () => {
    const q = parseAdminDoctorFinanceParams({});
    const w = buildAdminDoctorFinanceBillingWhere(q, [1, 2]);
    expect(w.doctorId).toEqual({ in: [1, 2] });
  });
});

describe("serializeAdminDoctorFinanceQuery", () => {
  it("round-trips key fields", () => {
    const q = parseAdminDoctorFinanceParams({
      from: "2026-05-01",
      to: "2026-05-08",
      doctorId: "5",
      areaId: "2",
      search: "খান",
      closure: "all",
      page: "3",
      limit: "40",
    });
    const s = serializeAdminDoctorFinanceQuery(q);
    const q2 = parseAdminDoctorFinanceParams(Object.fromEntries(new URLSearchParams(s)));
    expect(q2.doctorId).toBe(q.doctorId);
    expect(q2.areaId).toBe(q.areaId);
    expect(q2.search).toBe(q.search);
    expect(q2.closure).toBe(q.closure);
    expect(q2.page).toBe(q.page);
    expect(q2.limit).toBe(q.limit);
    expect(q2.from?.getTime()).toBe(q.from?.getTime());
    expect(q2.to?.getTime()).toBe(q.to?.getTime());
  });
});
