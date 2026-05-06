import type { Prisma } from "@/generated/prisma/client";
import type { AnimalKind, LeadPriority, LeadStatus } from "@/generated/prisma/enums";
import {
  AnimalKind as AnimalKindEnum,
  LeadPriority as LeadPriorityEnum,
  LeadStatus as LeadStatusEnum,
} from "@/generated/prisma/enums";

const ALLOWED_STATUSES = new Set<string>(Object.values(LeadStatusEnum));
const ALLOWED_PRIORITIES = new Set<string>(Object.values(LeadPriorityEnum));
const ANIMAL_KIND_LOOKUP = new Set<string>(Object.values(AnimalKindEnum));

export type ParsedAdminLeadsQuery = {
  q?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  area?: string;
  animalType?: string;
  problemCategory?: string;
  doctorId?: number;
  /** `YYYY-MM-DD` for `<input type="date" />` */
  fromInput?: string;
  toInput?: string;
  page: number;
};

function firstString(
  v: string | string[] | undefined,
): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const t = s.trim();
  return t.length ? t : undefined;
}

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Parse `YYYY-MM-DD` into local day bounds; returns undefined if invalid. */
function dayStart(s: string): Date | undefined {
  if (!isValidYmd(s)) return undefined;
  const d = new Date(`${s}T00:00:00.000`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function dayEnd(s: string): Date | undefined {
  if (!isValidYmd(s)) return undefined;
  const d = new Date(`${s}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseAdminLeadsSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ParsedAdminLeadsQuery {
  const q = firstString(raw.q);
  const statusRaw = firstString(raw.status);
  const status =
    statusRaw && ALLOWED_STATUSES.has(statusRaw)
      ? (statusRaw as LeadStatus)
      : undefined;

  const priorityRaw = firstString(raw.priority);
  const priority =
    priorityRaw && ALLOWED_PRIORITIES.has(priorityRaw)
      ? (priorityRaw as LeadPriority)
      : undefined;

  const area = firstString(raw.area);
  const animalType = firstString(raw.animalType);
  const problemCategory = firstString(raw.problemCategory);

  let doctorId: number | undefined;
  const doctorIdStr = firstString(raw.doctorId);
  if (doctorIdStr) {
    const n = parseInt(doctorIdStr, 10);
    if (!Number.isNaN(n) && n > 0) doctorId = n;
  }

  const fromInput = firstString(raw.from);
  const toInput = firstString(raw.to);

  const pageRaw = firstString(raw.page);
  let page = 1;
  if (pageRaw) {
    const n = parseInt(pageRaw, 10);
    if (!Number.isNaN(n) && n >= 1) page = n;
  }

  return {
    q,
    status,
    priority,
    area,
    animalType,
    problemCategory,
    doctorId,
    fromInput: fromInput && dayStart(fromInput) ? fromInput : undefined,
    toInput: toInput && dayEnd(toInput) ? toInput : undefined,
    page,
  };
}

export function buildLeadWhere(
  parsed: ParsedAdminLeadsQuery,
): Prisma.LeadWhereInput {
  const clauses: Prisma.LeadWhereInput[] = [];

  if (parsed.q) {
    clauses.push({
      OR: [
        {
          customerName: { contains: parsed.q, mode: "insensitive" },
        },
        { phone: { contains: parsed.q, mode: "insensitive" } },
      ],
    });
  }

  if (parsed.status) {
    clauses.push({ status: parsed.status });
  }

  if (parsed.priority) {
    clauses.push({ priority: parsed.priority });
  }

  if (parsed.area) {
    clauses.push({
      OR: [
        { area: { contains: parsed.area, mode: "insensitive" } },
        {
          selectedArea: {
            name: { contains: parsed.area, mode: "insensitive" },
          },
        },
        {
          selectedArea: {
            nameBn: { contains: parsed.area, mode: "insensitive" },
          },
        },
      ],
    });
  }

  if (parsed.animalType) {
    const upper = parsed.animalType.trim().toUpperCase();
    if (ANIMAL_KIND_LOOKUP.has(upper)) {
      clauses.push({
        OR: [
          { animalKind: upper as AnimalKind },
          {
            animalType: { contains: parsed.animalType, mode: "insensitive" },
          },
        ],
      });
    } else {
      clauses.push({
        animalType: { contains: parsed.animalType, mode: "insensitive" },
      });
    }
  }

  if (parsed.problemCategory) {
    clauses.push({
      problemCategory: {
        contains: parsed.problemCategory,
        mode: "insensitive",
      },
    });
  }

  if (parsed.doctorId !== undefined) {
    clauses.push({ assignedDoctorId: parsed.doctorId });
  }

  const fromD =
    parsed.fromInput !== undefined ? dayStart(parsed.fromInput) : undefined;
  const toD =
    parsed.toInput !== undefined ? dayEnd(parsed.toInput) : undefined;

  if (fromD || toD) {
    const range: Prisma.DateTimeFilter = {};
    if (fromD) range.gte = fromD;
    if (toD) range.lte = toD;
    clauses.push({ createdAt: range });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0] as Prisma.LeadWhereInput;
  return { AND: clauses };
}

export function hasActiveFilters(parsed: ParsedAdminLeadsQuery): boolean {
  return !!(
    parsed.q ||
    parsed.status ||
    parsed.priority ||
    parsed.area ||
    parsed.animalType ||
    parsed.problemCategory ||
    parsed.doctorId !== undefined ||
    parsed.fromInput ||
    parsed.toInput
  );
}

/** Build query string for the admin requests list preserving filters; override `page`. */
export function adminLeadsQueryString(
  parsed: ParsedAdminLeadsQuery,
  overrides: { page?: number } = {},
): string {
  const page = overrides.page ?? parsed.page;
  const p = new URLSearchParams();
  if (parsed.q) p.set("q", parsed.q);
  if (parsed.status) p.set("status", parsed.status);
  if (parsed.priority) p.set("priority", parsed.priority);
  if (parsed.area) p.set("area", parsed.area);
  if (parsed.animalType) p.set("animalType", parsed.animalType);
  if (parsed.problemCategory) p.set("problemCategory", parsed.problemCategory);
  if (parsed.doctorId !== undefined) p.set("doctorId", String(parsed.doctorId));
  if (parsed.fromInput) p.set("from", parsed.fromInput);
  if (parsed.toInput) p.set("to", parsed.toInput);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s.length ? `?${s}` : "";
}
