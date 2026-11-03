/**
 * Battery Tracking's provisioning data: where each battery is in the Battery
 * Onboarding flow that the ops (scanner) app records, per the PRD "Battery
 * Inventory Tracking App for Kenya Operations". The portal only shows it, so
 * nothing here changes a battery.
 *
 * A battery is always in one state (BatteryStatus). "Repair in progress" and
 * "Charge due" are flags shown beside the state, never instead of it. Every
 * action and telemetry change is an entry in the battery's log, newest first.
 *
 * buildProvisioning makes one battery's record and log from a short plan (its
 * state, plus any flag), walking the PRD's Status Transitions table up to that
 * state. Times are minutes before the page loads, like Last Seen, so a log
 * reads the same whenever it is opened. It is seeded by the serial and never
 * calls Math.random, so the same battery always gets the same history.
 */

export type BatteryStatus = "pre_bringup" | "ready_1" | "storage" | "ready_2" | "active" | "quarantine" | "retired";

/** The PRD's lifecycle order, for filters and the summary strip. */
export const STATUS_ORDER: BatteryStatus[] = ["pre_bringup", "ready_1", "storage", "ready_2", "active", "quarantine", "retired"];

/** The PRD's state names, word for word. */
export const STATUS_LABELS: Record<BatteryStatus, string> = {
  pre_bringup: "Pre-bring-up",
  ready_1: "Deployment-ready 1/2",
  storage: "Register for Storage/charging",
  ready_2: "Deployment-ready 2/2",
  active: "Active",
  quarantine: "Quarantine",
  retired: "Retired",
};

/** The PRD's X: a stored battery is Charge due after more than this many days without a storage charge. */
export const CHARGE_DUE_DAYS = 30;

export const WAREHOUSES = ["Warehouse 1", "Warehouse 2"] as const;
export type Warehouse = (typeof WAREHOUSES)[number];

export const MAINTENANCE_TYPES = [
  "Inspection", "Preventive Maintenance", "Firmware Update", "Cleaning",
  "Calibration", "Minor Repair", "Connector Replacement", "Other",
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const QUARANTINE_REASONS = [
  "Capacity Failure", "Firmware Failure", "Physical Damage", "Safety Issue",
  "Communication Failure", "Customer Complaint", "Other",
] as const;
export type QuarantineReason = (typeof QUARANTINE_REASONS)[number];

export const RETIRED_TYPES = ["End of Life", "Beyond Repair", "Safety Risk", "Written Off"] as const;
export type RetiredType = (typeof RETIRED_TYPES)[number];

/** The Battery Logs filter's event types (PRD screen 3.3). */
export type BatteryEventType =
  | "shipment" | "bringup_1" | "bringup_2" | "storage" | "repair"
  | "quarantine" | "retest" | "vehicle" | "station" | "retired";

export const EVENT_TYPES: { value: BatteryEventType; label: string }[] = [
  { value: "shipment", label: "Shipment" },
  { value: "bringup_1", label: "Bring-up 1/2" },
  { value: "bringup_2", label: "Bring-up 2/2" },
  { value: "storage", label: "Storage" },
  { value: "repair", label: "Repair & Maintenance" },
  { value: "quarantine", label: "Quarantine" },
  { value: "retest", label: "Retest" },
  { value: "vehicle", label: "Vehicle in/out" },
  { value: "station", label: "Battery station in/out" },
  { value: "retired", label: "Retired" },
];

/** One log entry. `from`/`to` are set when the entry changed the battery's state. */
export interface BatteryEvent {
  /** ms. */
  at: number;
  type: BatteryEventType;
  /** The technician, or "System" for telemetry. */
  who: string;
  text: string;
  /** "lat, long" the battery reported then, or "". */
  location: string;
  /** Absent on the entry that created the battery. */
  from?: BatteryStatus;
  to?: BatteryStatus;
}

/** When a step was done, and by whom. */
export interface Stamp {
  at: number;
  by: string;
}

export interface Provisioning {
  status: BatteryStatus;
  repairInProgress: boolean;
  /** In storage, and more than CHARGE_DUE_DAYS days since its last storage charge (or registration). */
  chargeDue: boolean;
  /** Linked at Register for Storage, so null before it. `receivedOn` defaults to the shipment's registration. */
  shipment: { number: string; warehouse: Warehouse; batteries: number; receivedOn: number } | null;
  bringUp1: Stamp | null;
  bringUp2: Stamp | null;
  /** Set once the battery was registered for storage. The day counts only while it is still in storage. */
  storage: {
    registeredAt: number;
    /** Null when it has never had a storage charge. */
    lastChargeAt: number | null;
    charges: number;
    daysInStorage: number | null;
    daysSinceCharge: number | null;
  } | null;
  firstDeployedAt: number | null;
  openRepair: { types: MaintenanceType[]; notes: string; at: number; by: string } | null;
  quarantine: { reasons: QuarantineReason[]; notes: string; at: number; by: string; statusBefore: BatteryStatus } | null;
  retired: { type: RetiredType; notes: string; at: number; by: string } | null;
  /** Newest first. */
  events: BatteryEvent[];
}

/** Where a quarantined (or retired) battery went into quarantine from. */
export type QuarantineVia = "active" | "bringup_1" | "bringup_2";

/** What a battery's record is built from. */
export interface Plan {
  status: BatteryStatus;
  /** An open repair: "Repair in progress". */
  repair?: boolean;
  /** In storage only: past the charge limit. */
  chargeDue?: boolean;
  /** Quarantine and Retired only. */
  via?: QuarantineVia;
  /** Quarantine via Active only: it had an open repair, which the quarantine closed. */
  closedRepair?: boolean;
}

/** A battery's asset, as battery-tracking.ts stores it. */
type Asset = { type: "station"; code: string; slot: number } | { type: "vehicle"; vin: string };

export interface PlanInput {
  serialNo: string;
  /** Null when the battery has never reported. */
  seenMinutesAgo: number | null;
  location: string;
  asset: Asset | null;
  plan: Plan;
}

/** The stations and vehicles a battery may have passed through before its current one. */
export interface AssetPool {
  stations: string[];
  vins: string[];
}

/** Shipments, by how many days before the page load they were registered (plus `shipmentAgo`'s fixed minutes). */
const SHIPMENTS: { number: string; warehouse: Warehouse; batteries: number; ageDays: number; by: string }[] = [
  { number: "SHP-KE-2024-118", warehouse: "Warehouse 1", batteries: 60, ageDays: 700, by: "Peter Kamau" },
  { number: "SHP-KE-2025-021", warehouse: "Warehouse 2", batteries: 60, ageDays: 560, by: "Grace Wanjiru" },
  { number: "SHP-KE-2025-047", warehouse: "Warehouse 1", batteries: 60, ageDays: 470, by: "Peter Kamau" },
  { number: "SHP-KE-2025-063", warehouse: "Warehouse 1", batteries: 60, ageDays: 400, by: "Ben Otieno" },
  { number: "SHP-KE-2025-089", warehouse: "Warehouse 2", batteries: 60, ageDays: 330, by: "Grace Wanjiru" },
  { number: "SHP-KE-2026-004", warehouse: "Warehouse 1", batteries: 60, ageDays: 260, by: "Faith Achieng" },
  { number: "SHP-KE-2026-019", warehouse: "Warehouse 2", batteries: 48, ageDays: 190, by: "Samuel Mwangi" },
  { number: "SHP-KE-2026-033", warehouse: "Warehouse 1", batteries: 48, ageDays: 130, by: "Ben Otieno" },
  { number: "SHP-KE-2026-041", warehouse: "Warehouse 2", batteries: 40, ageDays: 75, by: "Faith Achieng" },
  { number: "SHP-KE-2026-052", warehouse: "Warehouse 1", batteries: 40, ageDays: 30, by: "Peter Kamau" },
];

/** A shipment's registration, in minutes before the page load: its days plus a fixed time-of-day offset. */
const shipmentAgo = (s: (typeof SHIPMENTS)[number]) => s.ageDays * DAY + (hashStr(s.number) % 600);

const TECHNICIANS = ["Ben Otieno", "Grace Wanjiru", "Peter Kamau", "Faith Achieng", "Samuel Mwangi"];

const QUARANTINE_NOTES = [
  "Cell voltage drifts under load, needs a full capacity check.",
  "Casing cracked near the connector after a fall.",
  "BMS stops reporting after a few minutes on the cycler.",
  "Customer reported the battery cutting out on hills.",
  "Firmware update failed twice and the pack will not boot.",
];
const REPAIR_NOTES = [
  "Connector pins worn, replace before next deployment.",
  "Routine inspection after customer swap complaint.",
  "Firmware behind the fleet version, update and recheck.",
  "Loose housing screws found during swap station check.",
];
const RETIRE_NOTES = [
  "Capacity below 60% after repair, not worth another rebuild.",
  "Swollen cells found on retest, removed from service for safety.",
  "Pack damaged in transport and written off with the insurer.",
];
const REPAIR_DONE = [
  "Replaced connector and cleaned terminals.",
  "Updated firmware and recalibrated SOC.",
  "Tightened housing and resealed the lid.",
  "Replaced the BMS board and reran the cycler test.",
];

const DAY = 1440;

// ---- deterministic randomness (no Math.random: the same serial, the same history) ----

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let s = hashStr(seed);
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return {
    next,
    /** Whole number from a to b, both included. */
    int: (a: number, b: number) => a + Math.floor(next() * (b - a + 1)),
    float: (a: number, b: number) => a + next() * (b - a),
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
  };
}

// ---- dates ----

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "15 Oct 2026", UTC. */
export function fmtDay(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "15 Oct 2026 09:56", UTC: Last Seen's format. */
export function fmtUtc(ms: number): string {
  const d = new Date(ms);
  return `${fmtDay(ms)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "Active", or "Active (Repair in progress)", "Register for Storage/charging (Charge due)" (PRD screen 3.2). */
export function statusText(p: Pick<Provisioning, "status" | "repairInProgress" | "chargeDue">): string {
  const flags = [p.repairInProgress && "Repair in progress", p.chargeDue && "Charge due"].filter(Boolean);
  return flags.length ? `${STATUS_LABELS[p.status]} (${flags.join(", ")})` : STATUS_LABELS[p.status];
}

/** Where a quarantined battery goes after a successful repair (PRD screen 4.3). */
export const returnsTo = (statusBefore: BatteryStatus): BatteryStatus => (statusBefore === "active" ? "active" : "ready_2");

// ---- the builder ----

type Draft = Omit<BatteryEvent, "at"> & { ago: number; ref?: string };

function jitter(location: string, r: ReturnType<typeof rng>): string {
  const [lat, lng] = location.split(",").map(Number);
  if (!location.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `${(lat + r.float(-0.01, 0.01)).toFixed(5)}, ${(lng + r.float(-0.01, 0.01)).toFixed(5)}`;
}

/** `n` points spread from `hi` down to `lo` (minutes ago), first exactly `hi`, strictly decreasing. */
function spread(r: ReturnType<typeof rng>, hi: number, lo: number, n: number): number[] {
  if (n <= 1) return [hi];
  const inner = Array.from({ length: n - 1 }, () => Math.round(r.float(lo, hi - 60))).sort((a, b) => b - a);
  const out = [hi];
  for (const t of inner) out.push(Math.min(t, out[out.length - 1] - 60));
  return out;
}

export function buildProvisioning(input: PlanInput, now: number, pool: AssetPool): Provisioning {
  const { plan, serialNo } = input;
  const r = rng(serialNo);
  const drafts: Draft[] = [];
  const add = (d: Draft) => drafts.push({ ...d, ago: Math.round(d.ago) });
  const tech = () => r.pick(TECHNICIANS);
  const seen = input.seenMinutesAgo ?? 0;
  const loc = () => jitter(input.location, r);

  const via: QuarantineVia | null = plan.status === "quarantine" || plan.status === "retired" ? plan.via ?? "bringup_1" : null;
  const reaches = {
    storage: ["storage", "ready_2", "active"].includes(plan.status) || via === "bringup_2" || via === "active",
    ready_2: ["ready_2", "active"].includes(plan.status) || via === "active",
    active: plan.status === "active" || via === "active",
  };

  // ---- the end of onboarding, working back from now ----
  let retireAgo = 0;
  let quarAgo = 0;
  if (plan.status === "retired") {
    retireAgo = DAY * r.float(1, 20);
    quarAgo = retireAgo + DAY * r.int(2, 15);
  } else if (plan.status === "quarantine") {
    // Pulled from the network after its last report, or failed at bring-up.
    quarAgo = via === "active" ? Math.max(5, Math.round(seen * r.float(0.3, 0.9))) : DAY * r.float(0.2, 12);
  }

  // Telemetry: the stays in vehicles and stations from first deployment to now.
  type Stay = { asset: Asset; inAgo: number; outAgo: number | null };
  const stays: Stay[] = [];
  let depAgo = 0;
  let pastQuarantine: { at: number; back: number } | null = null;
  if (reaches.active) {
    const current = plan.status === "active" ? input.asset : null;
    // The latest telemetry point, before the battery last reported: the current asset's "in", or the last "out".
    const lastPoint = current ? seen + r.int(10, 3 * DAY) : seen + r.int(5, 300);
    depAgo = lastPoint + DAY * r.int(30, 240);
    const n = r.int(1, 4);
    const points = spread(r, depAgo, lastPoint, current ? 2 * n - 1 : 2 * n);
    points[points.length - 1] = Math.min(points[points.length - 1], lastPoint);
    const randomAsset = (): Asset =>
      r.next() < 0.6
        ? { type: "station", code: r.pick(pool.stations), slot: r.int(1, 8) }
        : { type: "vehicle", vin: r.pick(pool.vins) };
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      stays.push({
        asset: isLast && current ? current : randomAsset(),
        inAgo: points[2 * i],
        outAgo: isLast && current ? null : points[2 * i + 1],
      });
    }
    // One in ten deployed batteries came back from a quarantine once, between their first two stays.
    if (n >= 2 && r.next() < 0.12) {
      const gapFrom = stays[0].outAgo!;
      const gapTo = stays[1].inAgo;
      if (gapFrom - gapTo > 2 * DAY) pastQuarantine = { at: gapFrom - 60, back: gapTo + 60 };
    }
  }

  let bring2Ago = 0;
  if (reaches.ready_2) bring2Ago = reaches.active ? depAgo + DAY * r.float(1, 6) : DAY * r.float(0.5, 20);

  // Storage: from registration until Bring-up 2/2, the failed 2/2, or now.
  let regAgo = 0;
  if (reaches.storage) {
    const end = reaches.ready_2 ? bring2Ago : via === "bringup_2" ? quarAgo : 0;
    const span = (plan.status === "storage" ? (plan.chargeDue ? DAY * r.int(45, 250) : DAY * r.int(5, 250)) : DAY * r.int(40, 240)) + r.int(0, DAY);
    regAgo = end + span;
  }

  let bring1Ago = 0;
  let createdAgo: number;
  if (reaches.storage) {
    bring1Ago = regAgo + r.int(30, 2 * DAY);
    createdAgo = bring1Ago + r.int(20, 90);
  } else if (plan.status === "ready_1") {
    bring1Ago = DAY * r.float(0.1, 6);
    createdAgo = bring1Ago + r.int(20, 90);
  } else if (via === "bringup_1") {
    createdAgo = quarAgo + r.int(30, 180);
  } else {
    createdAgo = DAY * r.float(0.05, 4);
  }

  // ---- the log, oldest first ----

  // Shipment: the youngest few registered at least two days before the first scan.
  let shipment: (typeof SHIPMENTS)[number] | null = null;
  if (reaches.storage) {
    const eligible = SHIPMENTS.filter((s) => shipmentAgo(s) >= createdAgo + 2 * DAY).sort((a, b) => a.ageDays - b.ageDays);
    shipment = eligible[Math.min(eligible.length - 1, r.int(0, 1))] ?? SHIPMENTS[0];
    add({
      ago: shipmentAgo(shipment), type: "shipment", who: shipment.by, location: "",
      text: `Created the shipment · ${shipment.number} · ${shipment.warehouse} · ${shipment.batteries} batteries`,
    });
  }

  add({ ago: createdAgo, type: "bringup_1", who: tech(), location: "", to: "pre_bringup", text: "Battery created at its first Bring-up 1/2 scan." });

  const firstBy = tech();
  if (via === "bringup_1") {
    add({
      ago: quarAgo, type: "quarantine", who: firstBy, location: "", from: "pre_bringup", to: "quarantine", ref: "quarantine",
      text: `Moved this to quarantine from Bring-up 1/2. Notes: ${r.pick(QUARANTINE_NOTES)}`,
    });
  } else if (bring1Ago) {
    add({
      ago: bring1Ago, type: "bringup_1", who: firstBy, location: "", from: "pre_bringup", to: "ready_1", ref: "bringup_1",
      text: "Completed Bring-up 1/2. Powered on, SCUD connected, firmware verified, cycler and visual checks passed.",
    });
  }

  // Storage, its charges, and Charge due raised / cleared wherever a gap ran past the limit.
  let charges = 0;
  if (reaches.storage && shipment) {
    add({
      ago: regAgo, type: "storage", who: tech(), location: "", from: "ready_1", to: "storage", ref: "storage",
      text: `Registered this for storage · ${shipment.number} · ${shipment.warehouse} · received ${fmtDay(now - shipmentAgo(shipment) * 60_000)}`,
    });
    const end = reaches.ready_2 ? bring2Ago : via === "bringup_2" ? quarAgo : 0;
    const chargeTimes: number[] = [];
    if (r.next() < 0.5) chargeTimes.push(regAgo - 5); // "Charging for Storage" ticked at registration
    const gap = () => DAY * r.int(24, 36) + r.int(-240, 240);
    for (let t = regAgo - gap(); t > end + DAY; t -= gap()) chargeTimes.push(t);
    if (plan.status === "storage") {
      const limit = (CHARGE_DUE_DAYS + 2) * DAY;
      if (plan.chargeDue) {
        while (chargeTimes.length && chargeTimes[chargeTimes.length - 1] < limit) chargeTimes.pop();
      } else {
        const base = chargeTimes.length ? chargeTimes[chargeTimes.length - 1] : regAgo;
        if (base >= (CHARGE_DUE_DAYS - 1) * DAY) chargeTimes.push(DAY * r.float(0.5, 25));
      }
    }
    let base = regAgo;
    chargeTimes.forEach((t, i) => {
      if (base - t > (CHARGE_DUE_DAYS + 1) * DAY) {
        add({ ago: base - (CHARGE_DUE_DAYS + 1) * DAY, type: "storage", who: "System", location: "", text: `Charge due: more than ${CHARGE_DUE_DAYS} days since the last storage charge.` });
      }
      const ref = i === chargeTimes.length - 1 ? "lastCharge" : undefined;
      add({ ago: t, type: "storage", who: tech(), location: "", ref, text: "Logged a storage charge. Charged to 100%." });
      if (base - t > (CHARGE_DUE_DAYS + 1) * DAY) {
        add({ ago: t - 1, type: "storage", who: "System", location: "", text: "Charge due cleared by the storage charge." });
      }
      base = t;
    });
    // Still in storage and past the limit: raised and not yet cleared.
    if (plan.status === "storage" && base > (CHARGE_DUE_DAYS + 1) * DAY) {
      add({ ago: base - (CHARGE_DUE_DAYS + 1) * DAY, type: "storage", who: "System", location: "", text: `Charge due: more than ${CHARGE_DUE_DAYS} days since the last storage charge.` });
    }
    charges = chargeTimes.length;
  }

  if (via === "bringup_2") {
    add({
      ago: quarAgo, type: "quarantine", who: tech(), location: "", from: "storage", to: "quarantine", ref: "quarantine",
      text: `Moved this to quarantine from Bring-up 2/2. Notes: ${r.pick(QUARANTINE_NOTES)}`,
    });
  } else if (reaches.ready_2) {
    add({
      ago: bring2Ago, type: "bringup_2", who: tech(), location: "", from: "storage", to: "ready_2", ref: "bringup_2",
      text: "Completed Bring-up 2/2. Battery ready for deployment.",
    });
  }

  // Telemetry stays. The first "in" makes the battery Active.
  const assetText = (a: Asset) => (a.type === "vehicle" ? `vehicle ${a.vin}` : `battery station ${a.code} · slot ${a.slot}`);
  stays.forEach((s, i) => {
    const type = s.asset.type === "vehicle" ? "vehicle" : "station";
    add(
      i === 0
        ? { ago: s.inAgo, type, who: "System", location: loc(), from: "ready_2", to: "active", ref: "deployed", text: `First detected in ${assetText(s.asset)}. Battery is now Active.` }
        : { ago: s.inAgo, type, who: "System", location: loc(), text: `Put into ${assetText(s.asset)}.` }
    );
    if (s.outAgo !== null) add({ ago: s.outAgo, type, who: "System", location: loc(), text: `Taken out of ${assetText(s.asset)}.` });
  });

  if (pastQuarantine) {
    const by = tech();
    add({
      ago: pastQuarantine.at, type: "quarantine", who: by, location: loc(), from: "active", to: "quarantine",
      text: `Quarantined this. Reasons: ${r.pick(QUARANTINE_REASONS.slice(0, 6))}. Notes: ${r.pick(QUARANTINE_NOTES)}`,
    });
    add({
      ago: pastQuarantine.back, type: "retest", who: by, location: loc(), from: "quarantine", to: "active",
      text: `Completed the quarantine repair. ${r.pick(REPAIR_DONE)} Battery back to Active.`,
    });
  }

  // Repairs on a deployed battery: an open one (the flag), and maybe one closed earlier.
  let openRepair: Provisioning["openRepair"] = null;
  const openRepairAgo = plan.repair && plan.status !== "quarantine" ? DAY * r.float(0.3, 12) : null;
  if (reaches.active && plan.status === "active") {
    const lo = (openRepairAgo ?? 0) + 5 * DAY;
    const hi = depAgo - DAY;
    if (hi - lo > 5 * DAY && r.next() < 0.25) {
      const sent = r.float(lo + 4 * DAY, hi);
      const done = sent - DAY * r.float(0.5, 4);
      const overlaps = pastQuarantine && sent > pastQuarantine.back && done < pastQuarantine.at;
      const insideQuarantine = pastQuarantine && ((sent <= pastQuarantine.at && sent >= pastQuarantine.back) || (done <= pastQuarantine.at && done >= pastQuarantine.back));
      if (!overlaps && !insideQuarantine) {
        const by = tech();
        add({ ago: sent, type: "repair", who: by, location: loc(), text: `Sent for repair · ${r.pick(MAINTENANCE_TYPES.slice(0, 7))}. Notes: ${r.pick(REPAIR_NOTES)}` });
        add({ ago: done, type: "repair", who: by, location: loc(), text: `Completed the repair. ${r.pick(REPAIR_DONE)}` });
      }
    }
  }
  if (openRepairAgo !== null) {
    const types = [r.pick(MAINTENANCE_TYPES.slice(0, 7))];
    if (r.next() < 0.5) {
      const second = r.pick(MAINTENANCE_TYPES.slice(0, 7));
      if (second !== types[0]) types.push(second);
    }
    const notes = r.pick(REPAIR_NOTES);
    const by = tech();
    add({ ago: openRepairAgo, type: "repair", who: by, location: loc(), ref: "repair", text: `Sent for repair · ${types.join(", ")}. Notes: ${notes}` });
    openRepair = { types, notes, at: 0, by };
  }

  // A quarantine from the network (Active), with its closed repair if it had one.
  let quarantine: Provisioning["quarantine"] = null;
  if (via === "active") {
    const reasons: QuarantineReason[] = [r.pick(QUARANTINE_REASONS.slice(0, 6))];
    const notes = r.pick(QUARANTINE_NOTES);
    const by = tech();
    if (plan.closedRepair) {
      add({ ago: quarAgo + DAY * r.int(2, 10), type: "repair", who: tech(), location: loc(), text: `Sent for repair · Inspection. Notes: ${r.pick(REPAIR_NOTES)}` });
    }
    add({
      ago: quarAgo, type: "quarantine", who: by, location: loc(), from: "active", to: "quarantine", ref: "quarantine",
      text: `Quarantined this. Reasons: ${reasons.join(", ")}. Notes: ${notes}`,
    });
    if (plan.closedRepair) add({ ago: quarAgo - 1, type: "repair", who: by, location: loc(), text: "Open repair closed automatically: battery moved to quarantine." });
    quarantine = { reasons, notes, at: 0, by, statusBefore: "active" };
  } else if (via) {
    const d = drafts.find((x) => x.ref === "quarantine")!;
    const notes = d.text.split("Notes: ")[1];
    const reasons: QuarantineReason[] = [via === "bringup_1" ? "Capacity Failure" : "Firmware Failure"];
    quarantine = { reasons, notes, at: 0, by: d.who, statusBefore: via === "bringup_1" ? "pre_bringup" : "storage" };
  }

  let retired: Provisioning["retired"] = null;
  if (plan.status === "retired") {
    const type = r.pick(RETIRED_TYPES);
    const notes = r.pick(RETIRE_NOTES);
    const by = tech();
    add({ ago: retireAgo, type: "retired", who: by, location: "", from: "quarantine", to: "retired", ref: "retired", text: `Retired this battery · ${type}. Notes: ${notes}` });
    retired = { type, notes, at: 0, by };
    quarantine = null;
  }

  // ---- times: oldest first, strictly apart, then newest first ----
  drafts.sort((a, b) => b.ago - a.ago);
  for (let i = 1; i < drafts.length; i++) {
    if (drafts[i].ago >= drafts[i - 1].ago) drafts[i].ago = drafts[i - 1].ago - 1;
  }
  const atOf = (ago: number) => now - ago * 60_000;
  const refAt = (ref: string) => {
    const d = drafts.find((x) => x.ref === ref);
    return d ? { at: atOf(d.ago), by: d.who } : null;
  };
  // `ref` only links a record to its entry; the log doesn't carry it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const events: BatteryEvent[] = drafts.map(({ ago, ref, ...e }) => ({ ...e, at: atOf(ago) })).reverse();

  if (openRepair) openRepair.at = refAt("repair")!.at;
  if (quarantine) quarantine.at = refAt("quarantine")!.at;
  if (retired) retired.at = refAt("retired")!.at;

  const storageRef = refAt("storage");
  const daysAgo = (ms: number) => Math.floor((now - ms) / (DAY * 60_000));
  let storage: Provisioning["storage"] = null;
  if (storageRef) {
    const lastChargeAt = refAt("lastCharge")?.at ?? null;
    const stored = plan.status === "storage";
    storage = {
      registeredAt: storageRef.at,
      lastChargeAt,
      charges,
      daysInStorage: stored ? daysAgo(storageRef.at) : null,
      daysSinceCharge: stored ? daysAgo(lastChargeAt ?? storageRef.at) : null,
    };
  }

  return {
    status: plan.status,
    repairInProgress: openRepair !== null,
    chargeDue: storage?.daysSinceCharge != null && storage.daysSinceCharge > CHARGE_DUE_DAYS,
    shipment: shipment
      ? { number: shipment.number, warehouse: shipment.warehouse, batteries: shipment.batteries, receivedOn: now - shipmentAgo(shipment) * 60_000 }
      : null,
    bringUp1: refAt("bringup_1"),
    bringUp2: refAt("bringup_2"),
    storage,
    firstDeployedAt: refAt("deployed")?.at ?? null,
    openRepair,
    quarantine,
    retired,
    events,
  };
}
