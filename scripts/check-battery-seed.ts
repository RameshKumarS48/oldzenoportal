/**
 * Checks Battery Tracking's mock provisioning data against the PRD's rules.
 * Run: npx tsx scripts/check-battery-seed.ts  (exits 1 on any failure)
 */
import { batteriesAt, type BatteryRecord } from "../src/lib/mock/battery-tracking";
import { CHARGE_DUE_DAYS, STATUS_ORDER, type BatteryStatus } from "../src/lib/mock/battery-provisioning";

const now = Date.UTC(2026, 10, 3, 9, 30);
const rows = batteriesAt(now);
const errors: string[] = [];
const fail = (b: BatteryRecord | null, msg: string) => errors.push(`${b ? b.serialNo + ": " : ""}${msg}`);

const BROUGHT_UP: BatteryStatus[] = ["ready_1", "storage", "ready_2", "active"];
const ORDER = (s: BatteryStatus) => STATUS_ORDER.indexOf(s);

// Unique serials, determinism.
const serials = new Set(rows.map((b) => b.serialNo));
if (serials.size !== rows.length) fail(null, `duplicate serials: ${rows.length - serials.size}`);
if (JSON.stringify(batteriesAt(now)) !== JSON.stringify(rows)) fail(null, "batteriesAt is not deterministic");

const shipmentUse = new Map<string, { declared: number; used: number }>();

for (const b of rows) {
  const s = b.status;
  // Asset only when Active.
  if (b.asset && s !== "active") fail(b, `asset on a ${s} battery`);
  // Flags.
  if (b.repairInProgress && !BROUGHT_UP.includes(s)) fail(b, `repair flag on ${s}`);
  if (b.repairInProgress !== (b.openRepair !== null)) fail(b, "repair flag and open repair disagree");
  const expectDue = s === "storage" && b.storage!.daysSinceCharge! > CHARGE_DUE_DAYS;
  if (b.chargeDue !== expectDue) fail(b, `chargeDue ${b.chargeDue}, expected ${expectDue}`);
  // Records match the state.
  if ((s === "quarantine") !== (b.quarantine !== null)) fail(b, "quarantine record mismatch");
  if (b.quarantine && ["quarantine", "retired"].includes(b.quarantine.statusBefore)) fail(b, "bad statusBefore");
  if ((s === "retired") !== (b.retired !== null)) fail(b, "retired record mismatch");
  if (["storage", "ready_2", "active"].includes(s) && !b.storage) fail(b, "missing storage record");
  if (["pre_bringup", "ready_1"].includes(s) && (b.storage || b.shipment)) fail(b, "storage/shipment before storage");
  if (!!b.storage !== !!b.shipment) fail(b, "shipment and storage disagree");
  if (["ready_2", "active"].includes(s) && !b.bringUp2) fail(b, "missing Bring-up 2/2");
  if (s === "active" && !b.firstDeployedAt) fail(b, "Active with no first deployment");
  if (["pre_bringup", "ready_1", "storage", "ready_2"].includes(s) && (b.bringUp2 && ORDER(s) < 3 || b.firstDeployedAt)) fail(b, "later step on an earlier state");
  if (s === "pre_bringup" && b.bringUp1) fail(b, "Bring-up 1/2 on Pre-bring-up");
  if (b.storage && s === "storage" && b.storage.daysSinceCharge! > b.storage.daysInStorage!) fail(b, "days since charge > days in storage");
  if (b.storage && s !== "storage" && (b.storage.daysInStorage !== null || b.storage.daysSinceCharge !== null)) fail(b, "storage days outside storage");
  if (b.lastSeen === "" && (b.soc !== null || b.location !== "")) fail(b, "never reported but has SOC or location");

  // Dates.
  const ev = b.events;
  for (let i = 1; i < ev.length; i++) if (!(ev[i].at < ev[i - 1].at)) fail(b, `events not strictly newest first at ${i}`);
  if (ev.some((e) => e.at > now)) fail(b, "event in the future");
  // Telemetry comes from the battery, so none is newer than its last report.
  const seenMs = b.lastSeen ? Date.UTC(+b.lastSeen.slice(7, 11), ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(b.lastSeen.slice(3, 6)), +b.lastSeen.slice(0, 2), +b.lastSeen.slice(12, 14), +b.lastSeen.slice(15, 17)) : null;
  for (const e of ev) {
    if ((e.type === "vehicle" || e.type === "station") && (seenMs === null || e.at > seenMs + 60_000)) fail(b, "telemetry after the last report");
  }
  const chain = [b.shipment?.receivedOn, b.bringUp1?.at, b.storage?.registeredAt, b.storage?.lastChargeAt, b.bringUp2?.at, b.firstDeployedAt]
    .filter((x): x is number => typeof x === "number");
  for (let i = 1; i < chain.length; i++) if (chain[i] < chain[i - 1]) fail(b, `date chain out of order at ${i}`);

  if (b.shipment) {
    const u = shipmentUse.get(b.shipment.number) ?? { declared: b.shipment.batteries, used: 0 };
    u.used++;
    shipmentUse.set(b.shipment.number, u);
  }

  // Replay the log through the PRD's Status Transitions table.
  let state: BatteryStatus | null = null;
  let openRepair = false;
  let wasActiveBeforeQuarantine: BatteryStatus | null = null;
  for (const e of [...ev].reverse()) {
    const sent = e.text.startsWith("Sent for repair");
    const done = e.text.startsWith("Completed the repair") || e.text.startsWith("Open repair closed");
    if (sent) {
      if (!state || !BROUGHT_UP.includes(state) || openRepair) fail(b, `repair sent while ${state}${openRepair ? " with an open repair" : ""}`);
      openRepair = true;
    }
    if (done) {
      if (!openRepair) fail(b, "repair completed with none open");
      openRepair = false;
    }
    if ((e.type === "vehicle" || e.type === "station") && !e.to && state !== "active") fail(b, `telemetry while ${state}`);
    if (e.text.startsWith("Charge due") && state !== "storage") fail(b, `charge due event while ${state}`);
    if (!e.to) continue;
    if ((e.from ?? null) !== state) fail(b, `${e.type}: from ${e.from} but state is ${state}`);
    const ok =
      (state === null && e.to === "pre_bringup") ||
      (state === "pre_bringup" && e.to === "ready_1" && e.type === "bringup_1") ||
      (state === "ready_1" && e.to === "storage" && e.type === "storage") ||
      (state === "storage" && e.to === "ready_2" && e.type === "bringup_2") ||
      (state === "ready_2" && e.to === "active" && (e.type === "vehicle" || e.type === "station")) ||
      (state !== null && state !== "quarantine" && state !== "retired" && e.to === "quarantine" && e.type === "quarantine") ||
      (state === "quarantine" && e.type === "retest" && e.to === (wasActiveBeforeQuarantine === "active" ? "active" : "ready_2")) ||
      (state === "quarantine" && e.to === "retired" && e.type === "retired");
    if (!ok) fail(b, `illegal step ${state} → ${e.to} (${e.type})`);
    if (e.to === "quarantine") {
      wasActiveBeforeQuarantine = state;
      // A quarantine closes an open repair, logged right after it.
      if (openRepair) {
        const next = ev[ev.indexOf(e) - 1];
        if (!next?.text.startsWith("Open repair closed")) fail(b, "open repair not closed on quarantine");
      }
    }
    state = e.to;
  }
  if (state !== s) fail(b, `log ends on ${state}, record says ${s}`);
  if (openRepair !== b.repairInProgress) fail(b, "log's open repair disagrees with the flag");
  if (b.quarantine && b.quarantine.statusBefore !== wasActiveBeforeQuarantine) fail(b, "statusBefore disagrees with the log");
}

for (const [num, u] of shipmentUse) if (u.used > u.declared) fail(null, `shipment ${num}: ${u.used} batteries > ${u.declared}`);

const count = (f: (b: BatteryRecord) => boolean) => rows.filter(f).length;
console.log(`${rows.length} batteries`);
for (const s of STATUS_ORDER) console.log(`  ${s.padEnd(12)} ${count((b) => b.status === s)}`);
console.log(`  repair flag  ${count((b) => b.repairInProgress)}`);
console.log(`  charge due   ${count((b) => b.chargeDue)}`);
console.log(`  shipments    ${[...shipmentUse].map(([n, u]) => `${n.slice(-8)}:${u.used}`).join(" ")}`);
console.log(`  events       ${rows.reduce((n, b) => n + b.events.length, 0)}`);

if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.slice(0, 40).join("\n"));
  process.exit(1);
}
console.log("\nAll checks passed.");
