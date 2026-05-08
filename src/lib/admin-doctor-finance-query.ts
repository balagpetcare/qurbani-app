import type { Prisma } from "@/generated/prisma/client";

import { TreatmentCompletionStatus } from "@/generated/prisma/enums";

export type AdminDoctorFinanceClosureMode = "completed_only" | "all_closures";

export type AdminDoctorFinanceQuery = {
  from: Date | undefined;
  to: Date | undefined;
  doctorId: number | undefined;
  areaId: number | undefined;
  search: string;
  closure: AdminDoctorFinanceClosureMode;
  page: number;
  limit: number;
};

function formatYyyyMmDdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build query string for filters/pagination (no leading `?`). */
export function serializeAdminDoctorFinanceQuery(q: AdminDoctorFinanceQuery): string {
  const p = new URLSearchParams();
  if (q.from) p.set("from", formatYyyyMmDdUtc(q.from));
  if (q.to) p.set("to", formatYyyyMmDdUtc(q.to));
  if (q.doctorId != null) p.set("doctorId", String(q.doctorId));
  if (q.areaId != null) p.set("areaId", String(q.areaId));
  if (q.search.length > 0) p.set("search", q.search);
  if (q.closure === "all_closures") p.set("closure", "all");
  if (q.page > 1) p.set("page", String(q.page));
  if (q.limit !== 30) p.set("limit", String(q.limit));
  return p.toString();
}

function parseIsoDateStart(s: string | undefined): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return undefined;
  const d = new Date(`${s.trim()}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseIsoDateEnd(s: string | undefined): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return undefined;
  const d = new Date(`${s.trim()}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function pickParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key];
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s : undefined;
}

/** Shared parser for admin UI + APIs (query string). */
export function parseAdminDoctorFinanceParams(
  raw: Record<string, string | string[] | undefined>,
): AdminDoctorFinanceQuery {
  const from = parseIsoDateStart(pickParam(raw, "from"));
  const to = parseIsoDateEnd(pickParam(raw, "to"));
  const doctorRaw = pickParam(raw, "doctorId");
  const doctorParsed = doctorRaw ? parseInt(doctorRaw, 10) : NaN;
  const doctorId = Number.isFinite(doctorParsed) ? doctorParsed : undefined;
  const areaRaw = pickParam(raw, "areaId");
  const areaParsed = areaRaw ? parseInt(areaRaw, 10) : NaN;
  const areaId = Number.isFinite(areaParsed) ? areaParsed : undefined;
  const search = (pickParam(raw, "search") ?? "").trim();
  const closure: AdminDoctorFinanceClosureMode =
    pickParam(raw, "closure") === "all" ? "all_closures" : "completed_only";
  const page = Math.max(1, parseInt(pickParam(raw, "page") ?? "1", 10) || 1);
  const limitRaw = parseInt(pickParam(raw, "limit") ?? "30", 10) || 30;
  const limit = Math.min(100, Math.max(1, limitRaw));

  return {
    from,
    to,
    doctorId,
    areaId,
    search,
    closure,
    page,
    limit,
  };
}

export function buildAdminFinanceLeadWhere(q: AdminDoctorFinanceQuery): Prisma.LeadWhereInput {
  const lead: Prisma.LeadWhereInput = {};
  if (q.areaId != null) lead.areaId = q.areaId;
  return lead;
}

export function buildAdminDoctorFinanceBillingWhere(
  q: AdminDoctorFinanceQuery,
  doctorIds: number[] | undefined,
): Prisma.LeadCaseBillingWhereInput {
  const leadBase = buildAdminFinanceLeadWhere(q);
  const hasLeadKeys = Object.keys(leadBase).length > 0;

  const where: Prisma.LeadCaseBillingWhereInput = {};

  if (q.from != null || q.to != null) {
    where.completedAt = {};
    if (q.from != null) where.completedAt.gte = q.from;
    if (q.to != null) where.completedAt.lte = q.to;
  }

  if (q.closure === "completed_only") {
    where.status = TreatmentCompletionStatus.COMPLETED;
  }

  if (doctorIds != null) {
    where.doctorId = { in: doctorIds };
  }

  if (hasLeadKeys) {
    where.lead = leadBase;
  }

  return where;
}
