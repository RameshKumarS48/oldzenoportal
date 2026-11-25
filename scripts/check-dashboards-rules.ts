/**
 * Checks Dome Dashboards' rules, one case per rule.
 * Run: npx tsx scripts/check-dashboards-rules.ts  (exits 1 on any failure)
 */
import { REGISTRY_SEED as reg } from "../src/lib/dashboards/registry-seed";
import { DASHBOARD_SEED } from "../src/lib/dashboards/seed";
import { autoTitle, lower, cardRecords, cardSplitOptions, dashFilterFor, dashFilterOptions, measureError, measureOptions, resolveField, splitOptions } from "../src/lib/dashboards/registry";
import { addCardError, canEdit, canSee, cardErrors, cardKey, copyName, layoutRank, LIMITS, nameError, tidyCard } from "../src/lib/dashboards/rules";
import { searchRegistry, searchValues } from "../src/lib/dashboards/search";
import { effectiveView, maxSplits, shapeOf, viewsFor, VIEW_LABELS } from "../src/lib/dashboards/shape";
import { allowedGrains, autoGrain, buckets, compareRange, customRangeError, daysIn, effectiveGrain, resolveRange } from "../src/lib/dashboards/time";
import { isEmpty, runQuery, type Result } from "../src/lib/dashboards/query";
import type { Card, Dashboard, Measure } from "../src/lib/dashboards/types";

const failures: string[] = [];
const check = (name: string, ok: boolean) => { if (!ok) failures.push(name); };
const today = "2026-11-24";
const ctx = { range: resolveRange({ preset: "30d" }, today), today, filters: [] };
const card = (measures: Measure[], over: Partial<Card> = {}): Card => ({ id: "c", kind: "chart", measures, overTime: false, splits: [], filters: [], time: {}, ...over });
const swaps: Measure = { record: "swaps", fn: "count" };
const kwh: Measure = { record: "swaps", fn: "sum", field: "kwh" };
const dash = (over: Partial<Dashboard> = {}): Dashboard => ({ ...DASHBOARD_SEED[0], id: "d", ownerId: "me", ownerName: "Me", name: "Ops", cards: [], ...over });
const me = { id: "me", name: "Me", superAdmin: false };
const other = { id: "you", name: "You", superAdmin: false };
const admin = { id: "sa", name: "Admin", superAdmin: true };

// Names.
check("blank name refused", !!nameError("  ", "me", []));
check("short name refused", !!nameError("ab", "me", []));
check("61-character name refused", !!nameError("x".repeat(61), "me", []));
check("60-character name allowed", !nameError("x".repeat(60), "me", []));
check("duplicate name for the same owner refused, ignoring case and spaces", !!nameError("  ops ", "me", [dash()]));
check("same name for another owner allowed", !nameError("Ops", "you", [dash()]));
check("renaming to its own name allowed", !nameError("Ops", "me", [dash()], "d"));
check("copy name", copyName("Ops", "me", [dash()]) === "Ops (copy)");
check("second copy is numbered", copyName("Ops", "me", [dash(), dash({ id: "e", name: "Ops (copy)" })]) === "Ops (copy 2)");
check("copy of a copy doesn't stack suffixes", copyName("Ops (copy)", "me", [dash({ name: "Ops (copy)" })]) === "Ops (copy 2)");
check("copy name stays within the limit", copyName("x".repeat(60), "me", []).length <= LIMITS.nameMax);

// Who can see and change.
check("owner sees a private dashboard", canSee(dash({ visibility: "private" }), me));
check("others don't see a private dashboard", !canSee(dash({ visibility: "private" }), other));
check("others see a shared dashboard", canSee(dash({ visibility: "public" }), other));
check("others can't change a shared dashboard", !canEdit(dash({ visibility: "public" }), other));
check("Super Admin can change anyone's dashboard", canEdit(dash({ visibility: "private" }), admin) && canSee(dash({ visibility: "private" }), admin));

// Time.
check("last 7 days is 7 days ending today", daysIn(resolveRange({ preset: "7d" }, today)) === 7 && resolveRange({ preset: "7d" }, today).to === today);
check("last month", JSON.stringify(resolveRange({ preset: "last_month" }, today)) === JSON.stringify({ from: "2026-10-01", to: "2026-10-31" }));
check("last quarter", JSON.stringify(resolveRange({ preset: "last_quarter" }, today)) === JSON.stringify({ from: "2026-07-01", to: "2026-09-30" }));
check("this week starts on Monday", resolveRange({ preset: "this_week" }, today).from === "2026-11-23");
check("last month in January is December", resolveRange({ preset: "last_month" }, "2027-01-15").from === "2026-12-01");
check("custom range: start after end refused", !!customRangeError("2026-11-10", "2026-11-01", today));
check("custom range: future refused", !!customRangeError("2026-11-10", "2026-11-30", today));
check("custom range: over 24 months refused", !!customRangeError("2024-01-01", "2026-11-01", today));
check("custom range: missing date refused", !!customRangeError("", "2026-11-01", today));
check("custom range: one day allowed", !customRangeError(today, today, today));
check("grain: one day is hourly", autoGrain({ from: today, to: today }) === "hour");
check("grain: 30 days is daily", autoGrain(ctx.range) === "day");
check("grain: a year is weekly", autoGrain({ from: "2025-11-25", to: today }) === "week");
check("grain: two years is monthly", autoGrain({ from: "2024-11-25", to: today }) === "month");
check("hourly not allowed past 7 days", !allowedGrains(ctx.range).includes("hour"));
check("daily not allowed past 12 months", !allowedGrains({ from: "2024-12-01", to: today }).includes("day"));
check("a grain the range can't take falls back", effectiveGrain(ctx.range, "hour") === "day");
check("daily buckets", buckets(ctx.range, "day").length === 30);
check("hourly buckets", buckets({ from: today, to: today }, "hour").length === 24);
check("weekly buckets cover every day", buckets(ctx.range, "week").reduce((n, b) => n + b.days.length, 0) === 30);
check("previous period is the same length just before", JSON.stringify(compareRange({ from: "2026-11-01", to: "2026-11-10" }, "previous")) === JSON.stringify({ from: "2026-10-22", to: "2026-10-31" }));

// Measures come from the fields.
const options = measureOptions(reg, "swaps");
check("count is always offered first", options[0].measure.fn === "count");
check("every number field gets total and average", options.some((o) => o.measure.fn === "sum" && o.measure.field === "kwh") && options.some((o) => o.measure.fn === "avg" && o.measure.field === "duration"));
check("id fields get unique only", options.filter((o) => o.measure.field === "customerId").every((o) => o.measure.fn === "unique"));
check("category fields are never measured", !options.some((o) => o.measure.field === "status"));
check("named metrics appear on their record", options.some((o) => o.measure.metricId === "swap_success_rate"));
check("total of a category refused", !!measureError(reg, { record: "swaps", fn: "sum", field: "status" }));
check("unique of a number refused", !!measureError(reg, { record: "swaps", fn: "unique", field: "kwh" }));
check("measure on removed data refused", !!measureError(reg, { record: "gone", fn: "count" }));
check("metric on the wrong record refused", !!measureError(reg, { record: "swaps", fn: "metric", metricId: "station_uptime" }));

// Splits and cross-references.
check("own fields can split", splitOptions(reg, "swaps").some((o) => !o.ref.via && o.ref.field === "status"));
check("linked fields can split", splitOptions(reg, "swaps").some((o) => o.ref.via === "stations" && o.ref.field === "region"));
check("a linked record's name reads as the link", resolveField(reg, "swaps", { via: "stations", field: "name" })?.label === "Station");
check("linked field label", resolveField(reg, "swaps", { via: "stations", field: "region" })?.label === "Station › Region");
check("number fields can't split", !splitOptions(reg, "swaps").some((o) => o.field.type === "number"));
check("no second hop of links", !splitOptions(reg, "swaps").some((o) => o.ref.via === "sites"));
check("unlinked record's field doesn't resolve", resolveField(reg, "swaps", { via: "batteries", field: "state" }) === null);
const two = card([swaps, { record: "vehicles", fn: "count" }]);
check("two measures: only shared splits offered", cardSplitOptions(reg, two).every((o) => o.owner.id === "vehicles" || ["region", "country", "location"].includes(o.field.id)));
check("two measures: a split only one has is not offered", !cardSplitOptions(reg, two).some((o) => o.ref.field === "status" && !o.ref.via));
check("card records include linked data", cardRecords(card([swaps], { splits: [{ via: "stations", field: "region" }] })).includes("stations"));

// Shapes and views.
check("event alone, not over time, is a number", effectiveView(reg, card([swaps])) === "number");
check("over time is a line", effectiveView(reg, card([swaps], { overTime: true })) === "line");
check("over time with a split is lines", effectiveView(reg, card([swaps], { overTime: true, splits: [{ field: "status" }] })) === "lines");
check("a split is bars", effectiveView(reg, card([swaps], { splits: [{ field: "status" }] })) === "bars");
check("two splits is stacked bars", effectiveView(reg, card([swaps], { splits: [{ field: "status" }, { via: "stations", field: "region" }] })) === "stacked_bars");
check("two measures over time is bars and line", effectiveView(reg, card([swaps, kwh], { overTime: true })) === "combo");
check("two measures alone is a ratio", effectiveView(reg, card([swaps, kwh])) === "ratio");
check("a place split defaults to the map", effectiveView(reg, card([{ record: "sites", fn: "count" }], { splits: [{ field: "location" }] })) === "map");
check("histogram only for number fields", viewsFor(reg, card([kwh])).includes("histogram") && !viewsFor(reg, card([swaps])).includes("histogram"));
check("tiles only for things", viewsFor(reg, card([{ record: "batteries", fn: "count" }], { splits: [{ field: "state" }] })).includes("tiles") && !viewsFor(reg, card([swaps], { splits: [{ field: "status" }] })).includes("tiles"));
check("a view that no longer fits falls back", effectiveView(reg, card([swaps], { overTime: true, view: "donut" })) === "line");
check("a valid chosen view is kept", effectiveView(reg, card([swaps], { overTime: true, view: "area" })) === "area");
check("one split over time", maxSplits(card([swaps], { overTime: true })) === 1 && maxSplits(card([swaps])) === 2);
check("shape", shapeOf(card([swaps, kwh], { splits: [{ field: "status" }] })) === "two_split");

// Card rules.
const errs = (c: Card) => cardErrors(reg, c, today);
check("a plain card is valid", errs(card([swaps])).length === 0);
check("no measure refused", errs(card([])).length > 0);
check("three measures refused", errs(card([swaps, kwh, swaps])).length > 0);
check("two splits over time refused", errs(card([swaps], { overTime: true, splits: [{ field: "status" }, { via: "stations", field: "region" }] })).length > 0);
check("the same split twice refused", errs(card([swaps], { splits: [{ field: "status" }, { field: "status" }] })).length > 0);
check("a split the data doesn't have refused", errs(card([swaps], { splits: [{ field: "state" }] })).length > 0);
check("filter with no values refused", errs(card([swaps], { filters: [{ field: { field: "status" }, values: [] }] })).length > 0);
check("number filter with nothing entered refused", errs(card([swaps], { filters: [{ field: { field: "kwh" } }] })).length > 0);
check("number filter low above high refused", errs(card([swaps], { filters: [{ field: { field: "kwh" }, min: 5, max: 1 }] })).length > 0);
check("number filter with only a low value allowed", errs(card([swaps], { filters: [{ field: { field: "kwh" }, min: 1 }] })).length === 0);
check("seven filters refused", errs(card([swaps], { filters: Array.from({ length: 7 }, () => ({ field: { field: "status" }, values: ["Completed"] })) })).length > 0);
check("target view needs a target", errs(card([swaps], { view: "target" })).length > 0 && errs(card([swaps], { view: "target", target: 0 })).length > 0);
check("target view with a target allowed", errs(card([swaps], { view: "target", target: 1000 })).length === 0);
check("card's own bad range refused", errs(card([swaps], { time: { range: { preset: "custom", from: "2026-11-20", to: "2026-11-01" } } })).length > 0);
check("hourly on a card's 30-day range refused", errs(card([swaps], { overTime: true, time: { range: { preset: "30d" }, grain: "hour" } })).length > 0);
check("funnel with one step refused", errs(card([], { kind: "funnel", steps: [{ record: "preorders" }] })).length > 0);
check("funnel with nine steps refused", errs(card([], { kind: "funnel", steps: Array.from({ length: 9 }, (_, i) => ({ record: "preorders", where: { field: "stage", value: String(i) } })) })).length > 0);
check("funnel repeating a step refused", errs(card([], { kind: "funnel", steps: [{ record: "preorders" }, { record: "preorders" }] })).length > 0);
check("funnel with two different steps allowed", errs(card([], { kind: "funnel", steps: [{ record: "preorders" }, { record: "deliveries" }] })).length === 0);
check("flow needs both ends", errs(card([swaps], { kind: "flow", from: { field: "status" } })).length > 0);
check("flow ends must differ", errs(card([swaps], { kind: "flow", from: { field: "status" }, to: { field: "status" } })).length > 0);
check("flow with two fields allowed", errs(card([swaps], { kind: "flow", from: { via: "stations", field: "region" }, to: { field: "status" } })).length === 0);
check("retention needs a return event", errs(card([{ record: "recharges", fn: "count" }], { kind: "retention" })).length > 0);
check("empty note refused", errs(card([], { kind: "note", text: " " })).length > 0);
check("over-long note refused", errs(card([], { kind: "note", text: "x".repeat(LIMITS.noteMax + 1) })).length > 0);

// Changing the data keeps what still applies and names what was dropped.
const tidy = tidyCard(reg, card([{ record: "recharges", fn: "count" }], { splits: [{ field: "status" }, { via: "stations", field: "region" }], filters: [{ field: { field: "kwh" }, min: 1 }], view: "stacked_bars" }), "swaps");
check("splits the new data has are kept", tidy.card.splits.length === 1 && tidy.card.splits[0].field === "status");
check("dropped split and filter are named", tidy.dropped.length === 2 && tidy.dropped[0] === "split by station › region");
check("a view that stopped fitting is cleared", tidy.card.view === undefined);
check("going over time trims to one split", tidyCard(reg, card([swaps], { overTime: true, splits: [{ field: "status" }, { via: "stations", field: "region" }] })).card.splits.length === 1);

// Dashboard limits and layout.
check("24 cards is the limit", !!addCardError(dash({ cards: Array.from({ length: 24 }, () => card([swaps])) })) && !addCardError(dash({ cards: Array.from({ length: 23 }, () => card([swaps])) })));
check("same question, same key", cardKey(card([swaps], { id: "a", title: "A" })) === cardKey(card([swaps], { id: "b" })));
check("different question, different key", cardKey(card([swaps])) !== cardKey(card([swaps], { overTime: true })));
check("numbers come before charts, tables last", layoutRank(reg, card([swaps])) < layoutRank(reg, card([swaps], { overTime: true })) && layoutRank(reg, card([swaps], { overTime: true })) < layoutRank(reg, card([swaps], { splits: [{ field: "status" }], view: "table" })));
check("auto title", autoTitle(reg, card([kwh], { splits: [{ via: "stations", field: "region" }] })) === "Swaps: total kWh billed by station › region");
check("names keep their capitals mid-sentence", lower("kWh billed") === "kWh billed" && lower("Amount") === "amount" && lower("RFID") === "RFID" && lower("Dome users") === "Dome users");
check("a filter changes the key", cardKey(card([swaps], { filters: [{ field: { field: "status" }, values: ["Completed"] }] })) !== cardKey(card([swaps], { filters: [{ field: { field: "status" }, values: ["Flagged"] }] })));
check("a different measure field changes the key", cardKey(card([kwh])) !== cardKey(card([{ record: "swaps", fn: "sum", field: "points" }])));
check("an unset option doesn't change the key", cardKey(card([swaps], { view: undefined })) === cardKey(card([swaps])));
check("a number field is found by its unit", searchRegistry(reg, "kwh", { canView: () => true }).items.filter((i) => i.kind === "number").length >= 5);

// Dashboard-wide filters.
check("a shared field filters directly", dashFilterFor(reg, "customers", { fieldId: "region", name: "Region", values: ["Nairobi"] })?.field.via === undefined);
check("or through a link", dashFilterFor(reg, "swaps", { fieldId: "region", name: "Region", values: ["Nairobi"] })?.field.via === "stations");
check("or not at all", dashFilterFor(reg, "pricing_changes", { fieldId: "region", name: "Region", values: ["Nairobi"] }) === null);
check("filter options come from the cards' data", dashFilterOptions(reg, [card([swaps])]).some((o) => o.fieldId === "region") && dashFilterOptions(reg, []).length === 0);

// Search.
const all = () => true;
check("nothing typed lists only records, A to Z", searchRegistry(reg, "", { canView: all, pageSize: 100 }).items.every((i) => i.kind === "record") && searchRegistry(reg, "", { canView: all }).items[0].label === "App events");
check("search is paged", searchRegistry(reg, "", { canView: all, pageSize: 10 }).items.length === 10 && searchRegistry(reg, "", { canView: all, pageSize: 10 }).hasMore);
check("second page differs", searchRegistry(reg, "", { canView: all, pageSize: 10, page: 1 }).items[0].key !== searchRegistry(reg, "", { canView: all, pageSize: 10 }).items[0].key);
check("a record is found by the start of its name", searchRegistry(reg, "swa", { canView: all }).items[0].label.startsWith("Swap"));
check("a number field is found and pre-set to total", searchRegistry(reg, "kwh", { canView: all }).items.some((i) => i.kind === "number" && i.measure.fn === "sum"));
check("a named metric is found", searchRegistry(reg, "uptime", { canView: all }).items[0].kind === "metric");
check("data you can't open is not listed", !searchRegistry(reg, "wallet", { canView: (id) => id !== "wallet_transactions" }).items.some((i) => i.measure.record === "wallet_transactions"));
check("no match is empty", searchRegistry(reg, "zzzz", { canView: all }).items.length === 0);
check("record-only search skips fields", searchRegistry(reg, "amount", { canView: all, only: "record" }).items.length === 0);
check("value search", searchValues(["Nairobi", "Nyeri", "Mombasa"], "n").length === 2);

// Queries: every view of many cards draws real numbers, the same every time.
const finite = (r: Result): boolean => JSON.stringify(r).indexOf("null") === -1 || r.type === "value" || r.type === "funnel";
const samples: Card[] = [
  card([swaps]), card([kwh]), card([{ record: "swaps", fn: "avg", field: "duration" }]), card([{ record: "swaps", fn: "unique", field: "customerId" }]),
  card([{ record: "swaps", fn: "metric", metricId: "swap_success_rate" }]), card([{ record: "batteries", fn: "count" }]),
  card([swaps], { overTime: true }), card([kwh], { overTime: true }), card([swaps], { overTime: true, splits: [{ via: "stations", field: "name" }] }),
  card([swaps], { splits: [{ field: "status" }] }), card([kwh], { splits: [{ via: "stations", field: "region" }] }), card([{ record: "sites", fn: "count" }], { splits: [{ field: "location" }] }),
  card([{ record: "batteries", fn: "count" }], { splits: [{ field: "state" }] }), card([swaps], { splits: [{ field: "status" }, { via: "stations", field: "region" }] }),
  card([swaps, kwh], { overTime: true }), card([swaps, { record: "vehicles", fn: "count" }]), card([swaps, kwh], { splits: [{ via: "stations", field: "region" }] }),
];
let drawn = 0;
for (const c of samples) for (const view of viewsFor(reg, c)) {
  const r = runQuery(reg, { ...c, view, target: 1000 }, ctx);
  drawn++;
  check(`query draws: ${autoTitle(reg, c)} as ${view}`, r.type !== "error" && !isEmpty(r) && finite(r) && !JSON.stringify(r).includes("NaN"));
}
check("every view was exercised", new Set(samples.flatMap((c) => viewsFor(reg, c))).size === Object.keys(VIEW_LABELS).length && drawn > 60);
const q = (c: Card) => runQuery(reg, c, ctx);
check("same card, same numbers", JSON.stringify(q(card([swaps], { overTime: true }))) === JSON.stringify(q(card([swaps], { overTime: true }))));
const whole = q(card([swaps])) as Extract<Result, { type: "value" }>;
const parts = q(card([swaps], { splits: [{ field: "status" }] })) as Extract<Result, { type: "groups" }>;
check("a split adds up to the whole (within rounding)", Math.abs(parts.rows.reduce((s, r) => s + r.value, 0) - whole.value) <= parts.rows.length);
const daily = q(card([swaps], { overTime: true })) as Extract<Result, { type: "series" }>;
check("days add up to the period (within rounding)", Math.abs(daily.series[0].values.reduce((a, b) => a + b, 0) - whole.value) <= 30);
const filtered = q(card([swaps], { filters: [{ field: { field: "status" }, values: ["Completed"] }] })) as Extract<Result, { type: "value" }>;
check("a filter keeps fewer records", filtered.value < whole.value && filtered.value > 0);
const dashFiltered = runQuery(reg, card([swaps]), { ...ctx, filters: [{ fieldId: "region", name: "Region", values: ["Nairobi"] }] }) as Extract<Result, { type: "value" }>;
check("a dashboard filter applies through a link", dashFiltered.value < whole.value && dashFiltered.value > 0);
check("a card's own range overrides the dashboard's", (q(card([swaps], { time: { range: { preset: "7d" } } })) as Extract<Result, { type: "value" }>).value < whole.value);
check("a number has a previous period to compare with", whole.previous != null && whole.previous > 0);
check("things have no previous period", (q(card([{ record: "batteries", fn: "count" }])) as Extract<Result, { type: "value" }>).previous === null);
check("long splits are cut to the top 8 plus Other", (q(card([swaps], { splits: [{ via: "stations", field: "name" }] })) as Extract<Result, { type: "groups" }>).rows.length === 9);
check("averages get no Other row", !(q(card([{ record: "swaps", fn: "avg", field: "kwh" }], { splits: [{ via: "stations", field: "name" }] })) as Extract<Result, { type: "groups" }>).rows.some((r) => r.label === "Other"));
check("tables list every value", (q(card([swaps], { splits: [{ via: "stations", field: "name" }], view: "table" })) as Extract<Result, { type: "groups" }>).rows.length === 14);
check("removed data is reported", q(card([{ record: "gone", fn: "count" }])).type === "error");
check("rare events can have no data", isEmpty(runQuery(reg, card([{ record: "pricing_changes", fn: "count" }]), { ...ctx, range: { from: today, to: today } })));
const funnel = q(card([], { kind: "funnel", steps: [{ record: "app_events" }, { record: "preorders" }, { record: "deliveries" }] })) as Extract<Result, { type: "funnel" }>;
check("funnel steps only shrink", funnel.steps.every((s, i) => i === 0 || s.value <= funnel.steps[i - 1].value));
check("flow has links", (q(card([swaps], { kind: "flow", from: { via: "stations", field: "region" }, to: { field: "status" } })) as Extract<Result, { type: "flow" }>).links.length > 4);
const ret = q(card([{ record: "recharges", fn: "count" }], { kind: "retention", returnRecord: "swaps", time: { range: { preset: "90d" } } })) as Extract<Result, { type: "retention" }>;
check("retention starts at 100% and decays", ret.cohorts[0].cells[0] === 100 && ret.cohorts[0].cells[3] < ret.cohorts[0].cells[1]);
check("records list rows", (q(card([swaps], { kind: "records" })) as Extract<Result, { type: "records" }>).rows.length === 25);
check("seed dashboards are valid", DASHBOARD_SEED.every((d) => d.cards.every((c) => cardErrors(reg, c, today).length === 0 && runQuery(reg, c, ctx).type !== "error")));
check("registry is big enough to exercise search", reg.records.length >= 30);
check("every record has a date field and unique field ids", reg.records.every((r) => r.fields.some((f) => f.id === r.defaultTimeField) && new Set(r.fields.map((f) => f.id)).size === r.fields.length));
check("every link points at a record", reg.records.every((r) => r.links.every((l) => reg.records.some((x) => x.id === l.to))));
check("every metric points at a record", reg.metrics.every((m) => reg.records.some((r) => r.id === m.record)));

if (failures.length) {
  console.error(`${failures.length} check(s) failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("All Dome Dashboards rule checks passed.");
