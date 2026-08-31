import { NextResponse } from "next/server";

const SHEET_ID = "1xvif5q5zqBKRvAC395rh-J4rTf35v8IG";
const REPORTS_GID = "458264863";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${REPORTS_GID}`;

// Column N is the 14th column, 0-indexed = 13
const COL_N = 13;
const YEAR = 2026;

const FINANCIER_MAP: Record<string, string> = {
  "4gc": "4g",
  "4g capital": "4g",
  "cash": "cash",
  "fortune credit limited": "fortune",
  "fortune": "fortune",
  "greenwheels": "gw",
  "green wheels": "gw",
  "watu credit": "watu",
  "watu": "watu",
  "zeno finance": "zeno",
  "zeno": "zeno",
  "captive": "captive",
  "hustle wheelz": "hustle",
  "hustle wheez": "hustle",
  // Latin
  "m-kopa kenya mobility limited": "mkopa",
  "mkopa kenya mobility limited": "mkopa",
  "m-kopa": "mkopa",
  // Cyrillic variant found in sheet (lowercase of М-КОРА)
  "м-кора kenya mobility limited": "mkopa",
};

const CITY_MAP: Record<string, string> = {
  "nairobi": "nbo",
  "nanyuki": "nanyuki",
  "naro moru": "naromoru",
  "nyeri": "nyeri",
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function isoWeekToMonday(year: number, week: number): string {
  const jan4Utc = Date.UTC(year, 0, 4);
  const dow = new Date(jan4Utc).getUTCDay() || 7;
  const week1MonUtc = jan4Utc - (dow - 1) * 86400000;
  const d = new Date(week1MonUtc + (week - 1) * 7 * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parsePivotSection(
  rows: string[][],
  headerLabel: string // "Financier" or "City"
): { weekNums: number[]; weekCols: number[]; dataRows: string[][] } | null {
  const headerRowIdx = rows.findIndex(
    (r) => norm(r[COL_N] ?? "") === norm(headerLabel)
  );
  if (headerRowIdx < 0) return null;

  const headerRow = rows[headerRowIdx];
  const weekNums: number[] = [];
  const weekCols: number[] = [];
  for (let c = COL_N + 1; c < headerRow.length; c++) {
    const val = parseInt((headerRow[c] ?? "").trim(), 10);
    if (!isNaN(val) && val >= 1 && val <= 53) {
      weekNums.push(val);
      weekCols.push(c);
    }
  }

  // Collect data rows until Grand Total or blank label
  const dataRows: string[][] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const label = (rows[r][COL_N] ?? "").trim();
    if (norm(label) === "grand total") break;
    if (!label) continue;
    dataRows.push(rows[r]);
  }

  return { weekNums, weekCols, dataRows };
}

export async function GET() {
  let text: string;
  try {
    const res = await fetch(CSV_URL, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Export failed: HTTP ${res.status}` }, { status: 502 });
    }
    text = await res.text();
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch sheet", detail: String(err) }, { status: 502 });
  }

  const rows = parseCSV(text);

  // --- Partner section (header label: "Financier") ---
  const partnerSection = parsePivotSection(rows, "Financier");
  if (!partnerSection) {
    return NextResponse.json({ error: "Financier pivot not found in Reports tab" }, { status: 422 });
  }

  const { weekNums, weekCols } = partnerSection;

  // Also find Grand Total row for overall count
  const grandTotalRowIdx = rows.findIndex(
    (r, i) => {
      const label = norm(r[COL_N] ?? "");
      return label === "grand total" && i > 0 && i < 20; // first grand total = partner section
    }
  );

  // --- City section (header label: "City") ---
  const citySection = parsePivotSection(rows, "City");

  // Build buckets keyed by ISO week number
  type Bucket = {
    isoWeek: number;
    weekStart: string;
    overall: number;
    byPartner: Record<string, number>;
    byCity: Record<string, number>;
    byPartnerCity: Record<string, Record<string, number>>;
  };

  const buckets = new Map<number, Bucket>();
  weekNums.forEach((wk) => {
    buckets.set(wk, {
      isoWeek: wk,
      weekStart: isoWeekToMonday(YEAR, wk),
      overall: 0,
      byPartner: {},
      byCity: {},
      byPartnerCity: {},
    });
  });

  // Fill overall from Grand Total row
  if (grandTotalRowIdx >= 0) {
    const gtRow = rows[grandTotalRowIdx];
    weekNums.forEach((wk, i) => {
      const val = parseInt((gtRow[weekCols[i]] ?? "0").trim(), 10) || 0;
      buckets.get(wk)!.overall = val;
    });
  }

  // Fill byPartner from partner section data rows
  for (const row of partnerSection.dataRows) {
    const label = (row[COL_N] ?? "").trim();
    if (label.startsWith("#")) continue;
    const partnerId = FINANCIER_MAP[norm(label)];
    if (!partnerId) continue;
    weekNums.forEach((wk, i) => {
      const val = parseInt((row[weekCols[i]] ?? "0").trim(), 10) || 0;
      if (val > 0) buckets.get(wk)!.byPartner[partnerId] = val;
    });
  }

  // Fill byCity from city section data rows (skip #N/A rows)
  if (citySection) {
    for (const row of citySection.dataRows) {
      const label = (row[COL_N] ?? "").trim();
      if (label.startsWith("#")) continue;
      const cityKey = CITY_MAP[norm(label)];
      if (!cityKey) continue;
      weekNums.forEach((wk, i) => {
        const val = parseInt((row[weekCols[i]] ?? "0").trim(), 10) || 0;
        if (val > 0) buckets.get(wk)!.byCity[cityKey] = val;
      });
    }
  }

  const weeks = Array.from(buckets.values()).sort((a, b) => a.isoWeek - b.isoWeek);

  return NextResponse.json(
    {
      weeks,
      meta: {
        weekNums,
        partnerRows: partnerSection.dataRows.length,
        cityRows: citySection?.dataRows.length ?? 0,
      },
    },
    { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
  );
}
