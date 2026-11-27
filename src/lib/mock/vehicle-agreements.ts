/**
 * Mock data for the digital agreement signing PRD (portal part): the customer
 * attached to each vehicle and the agreements for that attachment. UI only,
 * nothing here comes from a backend.
 *
 * The vehicle's own customer name and phone are the source. Agreements need a
 * named customer: a vehicle without a customer name has no customer record
 * here, so its agreements read "No customer" (never Complete, Pending or
 * Missing). Its phone, if any, still shows on the detail page, read from the
 * vehicle. A named customer carries exactly the vehicle's name and phone.
 * Everything else (customer no., email, BaaS or not, the agreements) is
 * generated from the VIN, so it's the same on every load and
 * for vehicles added later. The cases the PRD calls out are pinned to vehicles
 * on the list's first page (see PINNED).
 *
 * Times are stored as UTC ISO strings. Every customer is in Kenya, so local
 * time is EAT (Africa/Nairobi, UTC+3), as elsewhere on Vehicle Tracking.
 */

export type CustomerType = "BaaS" | "Non-BaaS";
export type AgreementType = "warranty" | "energy";
export type AgreementStatus = "Signed" | "Pending" | "Not required";
export type AgreementTrigger = "Backlog" | "New attachment";

export const AGREEMENT_TYPES: AgreementType[] = ["warranty", "energy"];

export const AGREEMENT_LABELS: Record<AgreementType, string> = {
  warranty: "User Warranty Agreement",
  energy: "Zeno Energy Agreement",
};

/** Short names, for tight label columns; the full name goes in a tooltip and aria-labels. */
export const AGREEMENT_SHORT_LABELS: Record<AgreementType, string> = {
  warranty: "User Warranty",
  energy: "Zeno Energy",
};

/** Current published version of each agreement. */
const VERSIONS: Record<AgreementType, string> = { warranty: "2.1", energy: "1.3" };

export const NOT_REQUIRED_REASON = "Non-BaaS customers don't sign this agreement";

export const LOCAL_TIME_ZONE_LABEL = "EAT";

export interface VehicleCustomer {
  customerNo: string;
  name: string;
  phone: string;
  /** Null when there's no address on file. */
  email: string | null;
  type: CustomerType;
}

export interface Agreement {
  type: AgreementType;
  status: AgreementStatus;
  version: string;
  /** What asked for the signature: the backlog roll-out, or attaching this customer. Null when not required. */
  trigger: AgreementTrigger | null;
  /** UTC ISO. Null when not required. */
  requestedAt: string | null;
  /** UTC ISO, set only when signed. */
  signedAt: string | null;
  /** Set only when not required. */
  notRequiredReason: string | null;
}

export interface VehicleAgreements {
  customer: VehicleCustomer | null;
  /** The current attachment's agreements. Empty when no requirement was created (Missing). */
  agreements: Agreement[];
}

export type OverallAgreementStatus = "Complete" | "Pending" | "Missing" | "No customer";

export const OVERALL_STATUSES: OverallAgreementStatus[] = ["Complete", "Pending", "Missing", "No customer"];

export interface AgreementSummary {
  status: OverallAgreementStatus;
  /** Signed agreements out of those required (not "Not required"). 0 of 0 when Missing or No customer. */
  signed: number;
  required: number;
}

// ── Generation ───────────────────────────────────────────────────────────────

type Scenario = "bothSigned" | "oneSigned" | "bothPending" | "missing" | "nonBaasSigned" | "nonBaasPending";

/**
 * The PRD's cases, each on a page-1 vehicle (default sort). "No customer"
 * isn't pinned: it follows from the data, for every vehicle with no customer
 * name (e.g. ME92ZPSFA1J000112).
 */
const PINNED: Record<string, Scenario> = {
  ME92ZPSBB1J000760: "bothSigned",     // Peter Ngure
  ME92ZPSDB1J001111: "oneSigned",      // Ian Waruiro Mukiri
  ME92ZPSAB1J000542: "bothPending",    // Gilbert M'itonga
  ME92ZPSBB1J000817: "missing",        // Meshack Kibet
  ESUM0220522000030: "nonBaasSigned",  // Simon Nthenge
  ME92ZPSBB1J000840: "nonBaasPending", // Kelvin Juma
};

/** Unpinned vehicles: mostly complete, as after a roll-out, with the rest spread across the other cases. */
const SPREAD: Scenario[] = [
  "bothSigned", "bothSigned", "nonBaasSigned", "bothSigned", "oneSigned",
  "bothSigned", "nonBaasSigned", "bothPending", "bothSigned", "missing",
  "bothSigned", "nonBaasPending",
];

/** A small stable hash (FNV-1a), so a VIN always gets the same mock values. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** "Peter Ngure" → "peter.ngure@example.com". */
function emailFor(name: string): string {
  const local = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return `${local}@example.com`;
}

/** Backlog requests went out together; new attachments are spread over the last few weeks. */
const BACKLOG_REQUESTED = Date.UTC(2026, 7, 4, 6, 0); // 04 Aug 2026 09:00 EAT
const ATTACHMENT_WINDOW_START = Date.UTC(2026, 7, 10, 5, 0);
const HOUR = 3_600_000;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function agreement(
  vin: string,
  type: AgreementType,
  status: AgreementStatus,
  trigger: AgreementTrigger,
): Agreement {
  if (status === "Not required") {
    return {
      type, status, version: VERSIONS[type], trigger: null, requestedAt: null,
      signedAt: null, notRequiredReason: NOT_REQUIRED_REASON,
    };
  }
  // Both agreements for an attachment are requested together; each is signed in its own time.
  const requested =
    trigger === "Backlog"
      ? BACKLOG_REQUESTED
      : ATTACHMENT_WINDOW_START + (hash(vin) % (20 * 24)) * HOUR;
  const h = hash(`${vin}:${type}`);
  // Signed between 10 minutes and ~4 days after the request, at a believable minute.
  const signed = requested + (10 + (h % (4 * 24 * 60))) * 60_000;
  return {
    type,
    status,
    version: VERSIONS[type],
    trigger,
    requestedAt: iso(requested),
    signedAt: status === "Signed" ? iso(signed) : null,
    notRequiredReason: null,
  };
}

function build(vin: string, name: string, phone: string): VehicleAgreements {
  if (!name.trim()) return { customer: null, agreements: [] };

  const h = hash(vin);
  const scenario = PINNED[vin] ?? SPREAD[h % SPREAD.length];
  const nonBaas = scenario === "nonBaasSigned" || scenario === "nonBaasPending";
  const customer: VehicleCustomer = {
    customerNo: `ZC-${String(100000 + (h % 900000))}`,
    name,
    phone,
    email: emailFor(name),
    type: nonBaas ? "Non-BaaS" : "BaaS",
  };
  // Most requests came from the backlog roll-out; about a third from a new attachment.
  const trigger: AgreementTrigger = (h >> 4) % 3 === 0 ? "New attachment" : "Backlog";

  const a = (type: AgreementType, status: AgreementStatus) => agreement(vin, type, status, trigger);

  switch (scenario) {
    case "bothSigned":
      return { customer, agreements: [a("warranty", "Signed"), a("energy", "Signed")] };
    case "oneSigned":
      return { customer, agreements: [a("warranty", "Signed"), a("energy", "Pending")] };
    case "bothPending":
      return { customer, agreements: [a("warranty", "Pending"), a("energy", "Pending")] };
    case "missing":
      return { customer, agreements: [] };
    case "nonBaasSigned":
      return { customer, agreements: [a("warranty", "Signed"), a("energy", "Not required")] };
    case "nonBaasPending":
      return { customer, agreements: [a("warranty", "Pending"), a("energy", "Not required")] };
  }
}

const cache = new Map<string, VehicleAgreements>();

/** The customer and agreements for a vehicle, from the name and phone Vehicle Tracking holds for it. */
export function agreementsFor(v: { vin: string; customerName: string; customerPhone: string }): VehicleAgreements {
  const key = `${v.vin}|${v.customerName}|${v.customerPhone}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = build(v.vin, v.customerName, v.customerPhone);
    cache.set(key, hit);
  }
  return hit;
}

/** The overall status: every required agreement signed, some still pending, none created, or no customer. */
export function summarize(record: VehicleAgreements): AgreementSummary {
  if (!record.customer) return { status: "No customer", signed: 0, required: 0 };
  if (record.agreements.length === 0) return { status: "Missing", signed: 0, required: 0 };
  const required = record.agreements.filter((a) => a.status !== "Not required");
  const signed = required.filter((a) => a.status === "Signed").length;
  return { status: signed === required.length ? "Complete" : "Pending", signed, required: required.length };
}

export function agreementSummaryFor(v: { vin: string; customerName: string; customerPhone: string }): AgreementSummary {
  return summarize(agreementsFor(v));
}

// ── Formatting ───────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "14 Aug 2026 09:12" from UTC parts shifted by `offsetHours`. */
function format(isoText: string, offsetHours: number): string {
  const d = new Date(Date.parse(isoText) + offsetHours * HOUR);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "14 Aug 2026 06:12 UTC". */
export const formatUtc = (isoText: string) => `${format(isoText, 0)} UTC`;

/** "14 Aug 2026 09:12 EAT". EAT has no daylight saving, so a fixed +3 is exact. */
export const formatLocal = (isoText: string) => `${format(isoText, 3)} ${LOCAL_TIME_ZONE_LABEL}`;

/** "09:12 EAT", local. */
export const formatLocalTime = (isoText: string) => `${format(isoText, 3).slice(12)} ${LOCAL_TIME_ZONE_LABEL}`;

/** "14 Aug 2026", local. */
export const formatLocalDate = (isoText: string) => format(isoText, 3).slice(0, 11);
