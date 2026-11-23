/**
 * Imports the "Zeno Charging Database - Charging Asset Master" CSV export into
 * Zeno Charging: writes src/lib/mock/charging-seed.json and prints a report
 * of everything it had to change or flag.
 *
 *   npx tsx scripts/import-charging-csv.ts "<path to csv>"          # write the seed + report
 *   npx tsx scripts/import-charging-csv.ts "<path to csv>" --check  # report only; exits 1 if the counts look wrong
 *
 * Rules: blank rows are skipped; placeholder text ("Not available on Jira",
 * "Unavailable", "pending"…) becomes empty; dates become YYYY-MM-DD; a
 * repeated Asset ID stays on its first asset and is cleared on later ones.
 * Anything still missing or invalid is kept and flagged "Needs attention",
 * so it can't be saved again until someone fixes it.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsvObjects } from "../src/lib/charging/csv";
import { FIELDS, norm, type ChargingAsset, type ChargingAssetInput } from "../src/lib/charging/fields";
import { cleanInput, describeErrors, validateAsset } from "../src/lib/charging/validate";

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const check = args.includes("--check");
if (!csvPath) {
  console.error('Usage: npx tsx scripts/import-charging-csv.ts "<csv>" [--check]');
  process.exit(2);
}

const PLACEHOLDERS = new Set(["unavailable", "not available on jira", "not available", "n/a", "na", "-", "--", "tbd", "pending", "none", "nil", "null", "#n/a", "#ref!", "#value!", "not stated"]);
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const IMPORTED_BY = "import: Charging Asset Master sheet";
// The sheet export date, so the seed is the same every time it is generated.
const NOW = "2026-11-23T00:00:00.000Z";

const pad = (n: number) => String(n).padStart(2, "0");
function isoDate(raw: string): string | null {
  const s = raw.trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s); // dd/mm/yyyy, as the sheet writes it
  if (m) return build(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})[- ]([A-Za-z]{3})[A-Za-z]*[- ](\d{2,4})$/.exec(s); // 20-Jun-2025
  if (m && MONTHS[m[2].toLowerCase()]) return build(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
  function build(y: number, mo: number, d: number) {
    if (y < 100) y += 2000;
    const iso = `${y}-${pad(mo)}-${pad(d)}`;
    const dt = new Date(`${iso}T00:00:00Z`);
    return dt.toISOString().slice(0, 10) === iso ? iso : null;
  }
}

function stableId(n: number): string {
  const h = createHash("sha1").update(`zeno-charging-import:${n}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const rows = parseCsvObjects(readFileSync(resolve(csvPath), "utf8"));
const changes: string[] = [];
const notes = new Map<number, string[]>();
const note = (i: number, msg: string) => notes.set(i, [...(notes.get(i) ?? []), msg]);

// 1. Rows → clean inputs.
const kept: { line: number; input: ChargingAssetInput }[] = [];
let blank = 0;
rows.forEach((row, idx) => {
  const line = idx + 2; // the sheet's row number (header is row 1)
  // Blank rows (the sheet leaves a formula's " - " in Asset Name) have no site, type or ID.
  const meaningful = Object.values(row).some((v) => /[A-Za-z0-9]/.test(v));
  if (!meaningful || (!row["Site ID"]?.trim() && !row["Asset Type"]?.trim() && !row["Asset ID ( (BSCode / UID)"]?.trim() && !/[A-Za-z0-9]/.test(row["Asset Name"] ?? ""))) { blank++; return; }
  const raw: Record<string, unknown> = {};
  for (const f of FIELDS) {
    let v = (row[f.sheet] ?? "").trim();
    if (PLACEHOLDERS.has(v.toLowerCase())) {
      changes.push(`row ${line} · ${f.label}: “${v}” → empty`);
      v = "";
    }
    if (v && f.kind === "date") {
      const iso = isoDate(v);
      if (iso) v = iso;
      else { note(line, `${f.label} “${v}” isn’t a date`); v = ""; }
    }
    if (v && f.options) {
      const match = f.options.find((o) => o.toLowerCase() === v.toLowerCase());
      if (match && match !== v) v = match;
    }
    raw[f.key] = v;
  }
  const input = cleanInput(raw);
  const sheetPhone = (row["Site Partner Contact"] ?? "").trim();
  if (input.partnerContact && sheetPhone && input.partnerContact !== sheetPhone) changes.push(`row ${line} · Site partner phone: “${sheetPhone}” → ${input.partnerContact}`);
  kept.push({ line, input });
});

// 2. A repeated Asset ID stays with its first asset.
const seen = new Map<string, number>();
for (const { line, input } of kept) {
  if (!input.assetId) continue;
  const first = seen.get(norm(input.assetId));
  if (first) {
    note(line, `Asset ID ${input.assetId} was also on row ${first}; cleared here`);
    changes.push(`row ${line} · Asset ID ${input.assetId} (duplicate of row ${first}) → empty`);
    input.assetId = null;
  } else seen.set(norm(input.assetId), line);
}

// 3. Records, then flag whatever still breaks a rule.
const records: (ChargingAsset & { line: number })[] = kept.map(({ line, input }, i) => ({
  ...input, line, id: stableId(i + 1), version: 1, needsAttention: null, archivedAt: null,
  createdBy: IMPORTED_BY, createdAt: NOW, updatedBy: IMPORTED_BY, updatedAt: NOW,
}));
for (const r of records) {
  const { errors } = validateAsset(r, { others: records, selfId: r.id });
  const msgs = [...(notes.get(r.line) ?? []), ...(Object.keys(errors).length ? [describeErrors(errors)] : [])];
  r.needsAttention = msgs.length ? msgs.join(" · ") : null;
}

// 4. Report.
const flagged = records.filter((r) => r.needsAttention);
const sites = new Set(records.map((r) => r.siteId));
const byType = records.reduce<Record<string, number>>((m, r) => ({ ...m, [r.assetType || "(none)"]: (m[r.assetType || "(none)"] ?? 0) + 1 }), {});
const byField = new Map<string, number>();
for (const r of records) {
  const { errors } = validateAsset(r, { others: records, selfId: r.id });
  for (const k of Object.keys(errors)) byField.set(k, (byField.get(k) ?? 0) + 1);
}

console.log(`Rows in sheet: ${rows.length} · blank skipped: ${blank} · assets: ${records.length} · sites: ${sites.size}`);
console.log(`By type: ${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`Values cleaned: ${changes.length} · assets needing attention: ${flagged.length}`);
console.log(`Problems by field: ${[...byField].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}`);
const reportPath = resolve(process.env.REPORT_OUT ?? "charging-import-report.txt");
writeFileSync(reportPath, [
  `Zeno Charging import, ${NOW}`,
  `Source: ${csvPath}`,
  "",
  `NEEDS ATTENTION (${flagged.length})`,
  ...flagged.map((r) => `row ${r.line} · ${r.siteId} · ${r.assetName || "(no name)"} · ${r.assetId ?? "(no ID)"}\n    ${r.needsAttention}`),
  "",
  `VALUES CLEANED (${changes.length})`,
  ...changes,
].join("\n"));
console.log(`Full report: ${reportPath}`);

if (check) {
  const ok = records.length === 331 && sites.size === 203;
  if (!ok) { console.error("Unexpected counts (expected 331 assets at 203 sites)."); process.exit(1); }
  process.exit(0);
}

// 5. Seed data for the prototype (Dome keeps it in the browser, like its other mock data).
const seed = records.map((r) => {
  const { line, ...asset } = r;
  void line;
  return asset;
});
const out = resolve("src/lib/mock/charging-seed.json");
writeFileSync(out, JSON.stringify(seed, null, 0).replace(/\},\{/g, "},\n{") + "\n");
console.log(`Seed written: ${out} (${records.length} assets)`);
