// Checks the Swap Station Pricing rules in src/lib/pricing: billing
// (engine.ts), the window rules (windows.ts) and the plan form's rows
// (hour-rows.ts).
// Run with: node scripts/check-pricing.mjs   (Node 23+ strips the TS types)

import assert from "node:assert/strict";
import { register } from "node:module";

// The app imports "./windows" without an extension, which Node won't resolve
// on its own; this hook tries ".ts" for relative imports that don't resolve.
register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(spec, ctx, next) {
        try { return await next(spec, ctx); }
        catch (e) { if (spec.startsWith(".") && !/\\.[a-z]+$/.test(spec)) return next(spec + ".ts", ctx); throw e; }
      }`)
);

const { priceSwap, resolvePlan, slotFor, inWindow, planStatus, versionNumber } = await import("../src/lib/pricing/engine.ts");
const { validateWindows, rateRows, rateWarnings, splitVersion, compareWindows } = await import("../src/lib/pricing/windows.ts");
const rowsLib = await import("../src/lib/pricing/hour-rows.ts");
const { summarizeMoves } = await import("../src/lib/pricing/moves.ts");
const { stationHistory, stationNow } = await import("../src/lib/pricing/history.ts");

const v = (id, effectiveFrom, standardRate, customRate, start = "22:00", end = "06:00") => ({
  id, effectiveFrom, standardRate, customRate, customWindowStart: start, customWindowEnd: end,
  notifyLeadHours: 24, notificationText: "", createdBy: "test", createdAt: effectiveFrom,
});
const plan = (id, isDefault, versions) => ({ id, name: id, description: "", isDefault, versions, createdAt: "" });
const assign = (stationId, planId, effectiveFrom) => ({
  id: `${stationId}-${effectiveFrom}`, stationId, planId, effectiveFrom, assignedBy: "test", assignedAt: effectiveFrom,
});

const book = {
  plans: [
    plan("default", true, [v("d1", "2026-01-01T00:00:00+03:00", 90, 70)]),
    plan("saver", false, [v("s1", "2026-09-15T00:00:00+03:00", 80, 60)]),
    plan("night", false, [v("n1", "2026-09-10T00:00:00+03:00", 90, 55, "23:00", "05:00")]),
    plan("future", false, [v("f1", "2026-11-01T00:00:00+03:00", 95, 65)]),
  ],
  assignments: [
    assign("BS0002", "saver", "2026-09-15T00:00:00+03:00"),
    assign("BS0043", "night", "2026-09-10T00:00:00+03:00"),
    assign("BS0033", "future", "2026-11-01T00:00:00+03:00"),
    assign("BS0043", null, "2026-12-01T00:00:00+03:00"),
  ],
};

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

check("window wraps midnight", () => {
  assert.equal(inWindow(23 * 60, "22:00", "06:00"), true);
  assert.equal(inWindow(5 * 60 + 59, "22:00", "06:00"), true);
  assert.equal(inWindow(6 * 60, "22:00", "06:00"), false);
  assert.equal(inWindow(12 * 60, "22:00", "06:00"), false);
  assert.equal(inWindow(10 * 60, "09:00", "17:00"), true);
});

check("slot uses EAT even for UTC input", () => {
  // 20:30 UTC = 23:30 EAT, inside 22:00–06:00
  assert.equal(slotFor(book.plans[0].versions[0], "2026-10-01T20:30:00Z"), "custom_window");
  assert.equal(slotFor(book.plans[0].versions[0], "2026-10-01T09:00:00+03:00"), "standard");
});

check("unassigned station falls back to Default", () => {
  const r = resolvePlan(book, "bs0099", "2026-10-01T12:00:00+03:00");
  assert.equal(r.plan.id, "default");
  assert.equal(r.viaDefault, true);
});

check("lower-case station ids resolve", () => {
  assert.equal(resolvePlan(book, "bs0002", "2026-10-01T12:00:00+03:00").plan.id, "saver");
});

check("future plan is not active yet", () => {
  assert.equal(resolvePlan(book, "BS0033", "2026-10-23T12:00:00+03:00").plan.id, "default");
  assert.equal(resolvePlan(book, "BS0033", "2026-11-02T12:00:00+03:00").plan.id, "future");
  assert.equal(planStatus(book, book.plans[3], ["BS0033"], "2026-10-23T12:00:00+03:00"), "scheduled");
});

check("unassign sends a station back to Default", () => {
  assert.equal(resolvePlan(book, "BS0043", "2026-12-02T12:00:00+03:00").plan.id, "default");
});

check("plan change mid-swap: plan locked at tap, slot from completion", () => {
  const p = priceSwap(book, "BS0002", {
    rfidTapAt: "2026-09-14T23:59:20+03:00",
    depositAt: "2026-09-14T23:59:41+03:00",
    collectionAt: "2026-09-15T00:00:05+03:00",
    completedAt: "2026-09-15T00:00:24+03:00",
  }, 2);
  assert.equal(p.planId, "default");
  assert.equal(p.slot, "custom_window");
  assert.equal(p.window.slab1, 70);
  assert.equal(p.amount, 140);
  // The collection row reads the book after midnight and would have used Saver.
  assert.equal(p.events.find((e) => e.event === "collection").planId, "saver");
  assert.equal(p.events.filter((e) => e.charged).length, 1);
});

check("slot flips when the swap completes after the window opens", () => {
  const p = priceSwap(book, "BS0043", {
    rfidTapAt: "2026-10-01T22:59:30+03:00",
    depositAt: "2026-10-01T22:59:45+03:00",
    collectionAt: "2026-10-01T22:59:55+03:00",
    completedAt: "2026-10-01T23:00:10+03:00",
  }, 1);
  assert.equal(p.events[0].slot, "standard");
  assert.equal(p.slot, "custom_window");
  assert.equal(p.window.slab1, 55);
});

// ── Windows with slab rates (what the plan form saves) ──
const win = (start, end, slab1, slab2, isBase = false) => ({ start, end, slab1, slab2, isBase });
const cbd = {
  ...v("c1", "2026-09-01T00:00:00+03:00", 100, 70),
  windows: [win("06:00:00", "16:59:59", 100, 80, true), win("17:00:00", "21:59:59", 110, 90), win("22:00:00", "05:59:59", 70, 55)],
};
const windowBook = {
  plans: [book.plans[0], plan("cbd", false, [cbd])],
  assignments: [assign("BS0027", "cbd", "2026-09-01T00:00:00+03:00")],
};
const swapAt = (t) => ({ rfidTapAt: t, depositAt: t, collectionAt: t, completedAt: t });

check("windows are billed at the window the screens show", () => {
  // The legacy fields alone would bill this at the Standard 100.
  const p = priceSwap(windowBook, "BS0027", swapAt("2026-10-27T18:30:00+03:00"), 2);
  assert.equal(p.window.slab1, 110);
  assert.equal(p.slot, "custom_window");
  assert.equal(p.amount, 220);
});

check("inclusive window end: 21:59:59 is still the evening window", () => {
  assert.equal(priceSwap(windowBook, "BS0027", swapAt("2026-10-27T21:59:59+03:00"), 1).window.slab1, 110);
  assert.equal(priceSwap(windowBook, "BS0027", swapAt("2026-10-27T22:00:00+03:00"), 1).window.slab1, 70);
});

check("slab 1 covers the first 3 kWh of the day, slab 2 the rest", () => {
  const fresh = priceSwap(windowBook, "BS0027", swapAt("2026-10-27T10:00:00+03:00"), 2);
  assert.equal(fresh.amount, 200); // 2 × 100
  const split = priceSwap(windowBook, "BS0027", swapAt("2026-10-27T10:00:00+03:00"), 2, 2);
  assert.equal(split.slab1KWh, 1);
  assert.equal(split.slab2KWh, 1);
  assert.equal(split.amount, 180); // 1 × 100 + 1 × 80
  const spent = priceSwap(windowBook, "BS0027", swapAt("2026-10-27T10:00:00+03:00"), 2, 5);
  assert.equal(spent.amount, 160); // 2 × 80
});

check("versions without windows bill one rate for both slabs", () => {
  const p = priceSwap(book, "BS0099", swapAt("2026-10-27T10:00:00+03:00"), 2, 5);
  assert.equal(p.amount, 180); // Default legacy 90, slab 2 = slab 1
});

// ── Plan form: slots first, fill the rest from Default ──
let seq = 0;
const key = () => `k${++seq}`;
const slot = (from, until, slab1 = "110", slab2 = "90") => ({ key: key(), origin: "slot", from, until, slab1, slab2, color: 0 });
const DEFAULT_WINDOWS = [win("06:00:00", "21:59:59", 90, 70, true), win("22:00:00", "05:59:59", 70, 55)];
const { fillFromDefault, gapStretches, uncoveredHours, setUntil, setFrom, addRow, addBlocked, rowsToWindows, rateError, cleanRate, windowsToRows, fromChoices, untilChoices } = rowsLib;
const hours = (rows) => rows.map((r) => `${r.origin}:${r.from}-${r.until}:${r.slab1}/${r.slab2}`);

check("gaps are read within the day: one crossing midnight is two stretches", () => {
  const rows = [slot(6, 10), slot(17, 20)];
  assert.deepEqual(gapStretches(rows), [{ from: 0, until: 6 }, { from: 10, until: 17 }, { from: 20, until: 24 }]);
  assert.equal(uncoveredHours(rows).length, 17);
});

check("fill makes one continuous row per gap at Default's Default Rate, split only at midnight", () => {
  const filled = fillFromDefault([slot(6, 10), slot(17, 20)], DEFAULT_WINDOWS, key);
  assert.deepEqual(hours(filled), [
    "default:0-6:90/70", "slot:6-10:110/90", "default:10-17:90/70", "slot:17-20:110/90", "default:20-24:90/70",
  ]);
  assert.equal(uncoveredHours(filled).length, 0);
  assert.equal(validateWindows(rowsToWindows(filled)), null);
  assert.deepEqual(hours(fillFromDefault([slot(6, 18)], DEFAULT_WINDOWS, key)), ["default:0-6:90/70", "slot:6-18:110/90", "default:18-24:90/70"]);
  assert.deepEqual(hours(fillFromDefault([], DEFAULT_WINDOWS, key)), ["default:0-24:90/70"]);
});

check("fill falls back to Default's rate at the gap's start when Default has no single Default Rate", () => {
  const mixed = [win("06:00:00", "21:59:59", 90, 70, true), win("22:00:00", "05:59:59", 70, 55, true)];
  assert.deepEqual(hours(fillFromDefault([slot(6, 22)], mixed, key)), ["default:0-6:70/55", "slot:6-22:110/90", "default:22-24:70/55"]);
});

check("a Default Rate row's times can't run into any row; a slot's can run over Default Rate rows", () => {
  const rows = fillFromDefault([slot(6, 10)], DEFAULT_WINDOWS, key); // 0–6, 6–10, 10–24
  const first = rows.findIndex((r) => r.from === 0);
  assert.equal(untilChoices(rows, first).find((c) => c.value === 8).disabledReason, "Used by slot 06:00:00–09:59:59");
  assert.equal(untilChoices(rows, first).find((c) => c.value === 5).disabledReason, undefined);
  const late = rows.findIndex((r) => r.from === 10);
  assert.match(fromChoices(rows, late).find((c) => c.value === 3).disabledReason ?? "", /Used by/);
  const s = rows.findIndex((r) => r.origin === "slot");
  assert.equal(untilChoices(rows, s).find((c) => c.value === 14).disabledReason, undefined);
});

check("a widened slot trims or splits a filled row; a narrowed one leaves a gap", () => {
  let rows = fillFromDefault([slot(6, 10)], DEFAULT_WINDOWS, key);
  const i = rows.findIndex((r) => r.origin === "slot");
  rows = setUntil(rows, i, 12, key); // 06–12 takes 10–12 from the 10–24 Default Rate row
  assert.deepEqual(hours(rows.filter((r) => r.origin === "default")), ["default:0-6:90/70", "default:12-24:90/70"]);
  assert.equal(uncoveredHours(rows).length, 0);
  const j = rows.findIndex((r) => r.origin === "slot");
  rows = setFrom(rows, j, 8, key); // 08–12: 06–08 is now a gap
  assert.deepEqual(gapStretches(rows), [{ from: 6, until: 8 }]);
  rows = fillFromDefault(rows, DEFAULT_WINDOWS, key);
  assert.equal(uncoveredHours(rows).length, 0);
});

check("a slot moved into the middle of a filled row splits it in two; Add slot needs a gap", () => {
  let rows = addRow([], key(), key); // 00–03
  rows = fillFromDefault(rows, DEFAULT_WINDOWS, key); // 03–24
  assert.equal(addBlocked(rows), "All 24 hours have a rate");
  const i = rows.findIndex((r) => r.origin === "slot");
  rows = setFrom(rows, i, 12, key); // 00–03 becomes 12–15, not a wrapping 12–03
  rows = setUntil(rows, rows.findIndex((r) => r.origin === "slot"), 14, key);
  assert.deepEqual(hours(rows.filter((r) => r.origin === "default")), ["default:3-12:90/70", "default:15-24:90/70"]);
  // Hours 0–3, where the slot started, and 14:00, given back by the shrink, are gaps now.
  assert.deepEqual(gapStretches(rows), [{ from: 0, until: 3 }, { from: 14, until: 15 }]);
  assert.equal(addBlocked(rows), null);
});

check("moving From past Until keeps the slot's length; Until before From wraps", () => {
  let rows = [slot(6, 10)];
  rows = setFrom(rows, 0, 15, key);
  assert.deepEqual([rows[0].from, rows[0].until], [15, 19]);
  rows = setFrom(rows, 0, 22, key);
  assert.deepEqual([rows[0].from, rows[0].until], [22, 24]); // clipped at midnight
  rows = setUntil(rows, 0, 6, key);
  assert.deepEqual([rows[0].from, rows[0].until], [22, 6]); // chosen wrap
  rows = setFrom(rows, 0, 23, key);
  assert.deepEqual([rows[0].from, rows[0].until], [23, 6]); // a wrapping slot keeps its Until
});

check("a new slot runs 3 hours, shorter where it meets a slot or midnight", () => {
  const one = addRow([slot(0, 7)], key(), key); // first gap is 07:00
  assert.deepEqual(one.filter((r) => r.from === 7).map((r) => [r.from, r.until]), [[7, 10]]); // 07:00:00–09:59:59
  const tight = addRow([slot(0, 7), slot(8, 24)], key(), key); // only 07:00 is free
  assert.deepEqual(tight.filter((r) => r.from === 7).map((r) => [r.from, r.until]), [[7, 8]]);
  const late = addRow([slot(0, 22)], key(), key);
  assert.deepEqual(late.filter((r) => r.from === 22).map((r) => [r.from, r.until]), [[22, 24]]);
});

check("at most 5 slots; filled rows don't count", () => {
  let rows = [slot(0, 1), slot(1, 2), slot(2, 3), slot(3, 4)];
  assert.equal(addBlocked(rows), null);
  rows = addRow(rows, key(), key);
  assert.equal(addBlocked(rows), "Maximum 5 slots");
  rows = fillFromDefault(rows, DEFAULT_WINDOWS, key);
  assert.equal(validateWindows([...rowsToWindows(rows).map((w) => ({ ...w, isBase: false }))]), "Use at most 5 time slots.");
});

check("windows: gaps and overlaps are refused, mixed rest-of-day rates allowed", () => {
  assert.match(validateWindows([win("06:00:00", "09:59:59", 110, 90)]), /No rate covers|whole day/);
  assert.match(validateWindows([...DEFAULT_WINDOWS, win("07:00:00", "08:59:59", 1, 1)]), /overlaps|Two windows/);
  assert.equal(validateWindows([win("00:00:00", "05:59:59", 70, 55, true), win("06:00:00", "23:59:59", 90, 70, true)]), null);
  assert.equal(validateWindows([win("00:00:00", "23:59:59", 100, 80)]), null); // one slot, all day
});

check("rates: whole numbers 1–500, KES prefix and spaces cleaned", () => {
  for (const bad of ["", "0", "501", "12.5", "-5", "abc", "1e2"]) assert.notEqual(rateError(bad), null, bad);
  for (const ok of ["1", "90", "500"]) assert.equal(rateError(ok), null, ok);
  assert.equal(cleanRate("KES 90"), "90");
  assert.equal(cleanRate(" 1 20 "), "120");
});

check("saved plans load with rest-of-day rows and slots in place", () => {
  const rows = windowsToRows([win("06:00:00", "16:59:59", 100, 80, true), win("17:00:00", "21:59:59", 110, 90), win("22:00:00", "05:59:59", 70, 55)], key);
  assert.deepEqual(rows.map((r) => r.origin), ["default", "slot", "slot"]);
});

check("comparisons list each rest-of-day stretch with its own rates", () => {
  const before = { windows: DEFAULT_WINDOWS };
  const after = { windows: rowsToWindows(fillFromDefault([slot(17, 20)], DEFAULT_WINDOWS, key)) };
  const rows = rateRows(before, after);
  assert.ok(rows.some((r) => r.label === "17:00:00–19:59:59" && !r.before && r.after?.slab1 === 110));
  assert.equal(splitVersion(after).base?.slab1, 90); // filled at Default's Default Rate throughout
});

check("soft warnings: slab 2 above slab 1, far from Default, same as Default", () => {
  const w1 = rateWarnings([win("00:00:00", "23:59:59", 80, 95)], DEFAULT_WINDOWS);
  assert.ok(w1.items.some((i) => i.kind === "slab_order" && i.time === "00:00:00–23:59:59"));
  const w2 = rateWarnings([win("00:00:00", "23:59:59", 400, 300)], DEFAULT_WINDOWS);
  assert.ok(w2.items.some((i) => i.kind === "far_from_default" && /Default's 90 \/ 70|Default's 70 \/ 55/.test(i.title)));
  assert.equal(rateWarnings(DEFAULT_WINDOWS, DEFAULT_WINDOWS).matchesDefault, true);
  assert.equal(rateWarnings(DEFAULT_WINDOWS, null).matchesDefault, false); // editing Default itself
});

check("comparing two plans cuts the day at every start on either side and merges equal neighbours", () => {
  const up = [win("06:00:00", "21:59:59", 80, 65, true), win("22:00:00", "05:59:59", 60, 50)];
  const cbd = [win("06:00:00", "16:59:59", 100, 80, true), win("17:00:00", "21:59:59", 110, 90), win("22:00:00", "05:59:59", 70, 55)];
  const rows = compareWindows(up, cbd).map((r) => `${r.start}-${r.end} ${r.before.slab1}/${r.before.slab2}>${r.after.slab1}/${r.after.slab2}`);
  assert.deepEqual(rows, ["06:00:00-16:59:59 80/65>100/80", "17:00:00-21:59:59 80/65>110/90", "22:00:00-05:59:59 60/50>70/55"]);
  assert.equal(compareWindows(up, up).length, 2);
});

// ── Moving stations (create with stations, assign, move to another plan) ──
const ALL = ["BS0002", "BS0009", "BS0043", "BS0099"];
const NOW = "2026-10-27T12:00:00+03:00";

check("versions are numbered per plan by effective time, whatever order they're stored in", () => {
  const plan = { versions: [{ id: "b", effectiveFrom: "2026-10-01T00:00:00+03:00" }, { id: "a", effectiveFrom: "2026-09-01T00:00:00+03:00" }] };
  assert.equal(versionNumber(plan, "a"), 1);
  assert.equal(versionNumber(plan, "b"), 2);
});

check("moves: codes are upper-cased and de-duplicated; unknown codes are flagged", () => {
  const m = summarizeMoves(book, ["bs0002", "BS0002", "BS7777"], "pp-new", ALL, NOW);
  assert.deepEqual(m.moves.map((x) => x.id), ["BS0002"]);
  assert.equal(m.moves[0].from.id, "saver");
  assert.deepEqual(m.unknown, ["BS7777"]);
});

check("moves: stations already on the target change nothing", () => {
  const m = summarizeMoves(book, ["BS0002", "BS0099"], "saver", ALL, NOW);
  assert.deepEqual(m.unchanged, ["BS0002"]);
  assert.deepEqual(m.moves.map((x) => x.id), ["BS0099"]);
  const toDefault = summarizeMoves(book, ["BS0099"], null, ALL, NOW);
  assert.deepEqual(toDefault.unchanged, ["BS0099"]); // already on Default
});

check("moves: a plan whose last station leaves is reported as emptied; Default never is", () => {
  const m = summarizeMoves(book, ["BS0043"], "pp-new", ALL, NOW); // Night is BS0043's only plan
  assert.deepEqual(m.emptied.map((p) => p.id), ["night"]);
  const fromDefault = summarizeMoves(book, ["BS0009", "BS0099"], "saver", ALL, NOW);
  assert.deepEqual(fromDefault.emptied, []);
});

// ── Station history ──
check("history: newest first, with from → to, and older rows read their reason from planId", () => {
  const h = stationHistory(book, "bs0043", NOW);
  assert.deepEqual(h.map((e) => `${e.from.id}→${e.to.id}:${e.reason}:${e.scheduled}`), [
    "night→default:removed:true", // 1 Dec, still to come
    "default→night:assigned:false",
  ]);
});

check("history: a move onto the plan a station is already on is left out", () => {
  const b2 = { ...book, assignments: [...book.assignments, { ...assign("BS0002", "saver", "2026-10-01T00:00:00+03:00"), id: "dup", reason: "assigned" }] };
  assert.equal(stationHistory(b2, "BS0002", NOW).length, 1);
});

check("history: deleting a plan reads as 'plan deleted'; a station never moved is on Default since go-live", () => {
  const b3 = { ...book, assignments: [...book.assignments, { ...assign("BS0002", null, "2026-10-20T00:00:00+03:00"), id: "del", reason: "plan_deleted" }] };
  const [latest] = stationHistory(b3, "BS0002", NOW);
  assert.equal(latest.reason, "plan_deleted");
  assert.equal(latest.to.id, "default");
  const never = stationNow(book, "BS0099", NOW);
  assert.equal(never.plan.id, "default");
  assert.equal(never.since, null);
  assert.equal(stationHistory(book, "BS0099", NOW).length, 0);
});

check("station now: current plan, since when, and who moved it last (scheduled moves don't count yet)", () => {
  const n = stationNow(book, "BS0043", NOW);
  assert.equal(n.plan.id, "night");
  assert.equal(n.since, "2026-09-10T00:00:00+03:00");
});

console.log(`\n${passed} checks passed`);
