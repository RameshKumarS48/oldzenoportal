// Checks the Custom Pricing rules in src/lib/pricing/engine.ts.
// Run with: node scripts/check-pricing.mjs   (Node 23+ strips the TS types)

import assert from "node:assert/strict";
import { priceSwap, resolvePlan, slotFor, inWindow, planStatus } from "../src/lib/pricing/engine.ts";

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

console.log(`\n${passed} checks passed`);
