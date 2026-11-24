/**
 * Validation for charging assets. Pure, so the form (instant feedback) and
 * the server (the authority) run exactly the same rules.
 */
import {
  FIELDS, FIELD_BY_KEY, norm, normaliseSiteId,
  type ChargingAsset, type ChargingAssetInput, type FieldKey,
} from "./fields";

export type FieldErrors = Partial<Record<FieldKey, string>>;
export interface Warning { key: string; message: string; otherId?: string }
export interface ValidationResult { errors: FieldErrors; warnings: Warning[] }

export const SWAP_ID = /^BS\d{4}$/;
export const CHARGER_UID = /^[0-9A-F]{24}$/;
export const SITE_ID = /^Site-(?!0+$)\d{4,}$/;
/** Assets of the same type closer than this, at different sites, may be the same asset entered twice. */
export const NEAR_METRES = 25;

/** Rough bounding boxes, so swapped or mistyped coordinates are caught. */
const COUNTRY_BOUNDS: Record<string, { lat: [number, number]; lng: [number, number] }> = {
  Kenya: { lat: [-4.9, 5.1], lng: [33.8, 42.0] },
  Uganda: { lat: [-1.6, 4.3], lng: [29.5, 35.1] },
  India: { lat: [6.5, 37.2], lng: [68.0, 97.5] },
};

// ── Cleaning ─────────────────────────────────────────────────────────────────

const blankToNull = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s+/g, " ");
  return s === "" ? null : s;
};

const toNumber = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Phone numbers as digits in international form; several numbers (the sheet
 * separates them with "/") are kept, joined by " / ". A Kenyan 07… number
 * gets its 254 prefix. Text with no digits is kept as typed, so validation can flag it.
 */
export function normalisePhone(v: string | null): string | null {
  if (!v) return null;
  const parts = v.split(/[\/,;]/).map((p) => p.trim()).filter(Boolean);
  const numbers = parts.map((p) => {
    let d = p.replace(/\D/g, "");
    if (d.length === 10 && d.startsWith("0")) d = `254${d.slice(1)}`;
    return d || p;
  });
  return numbers.length ? numbers.join(" / ") : null;
}

/** One international number: Kenya (254) and Uganda (256) have 12 digits; elsewhere 11–13. */
export function isValidPhone(d: string): boolean {
  if (!/^\d+$/.test(d) || d.startsWith("0")) return false;
  if (d.startsWith("254") || d.startsWith("256")) return d.length === 12;
  return d.length >= 11 && d.length <= 13;
}

/** Turns whatever the form or API sent into a clean input: trimmed, typed, empties as null. */
export function cleanInput(raw: Partial<Record<FieldKey, unknown>>): ChargingAssetInput {
  const out: Record<string, unknown> = {};
  for (const f of FIELDS) {
    const v = raw[f.key];
    if (f.kind === "lat" || f.kind === "lng" || f.kind === "money") out[f.key] = toNumber(v);
    else if (f.required && f.kind !== "date") out[f.key] = blankToNull(v) ?? "";
    else out[f.key] = blankToNull(v);
  }
  const input = out as unknown as ChargingAssetInput;
  // No ID is null, never "": several assets may await an ID, but no two may share one.
  input.assetId = input.assetId ? input.assetId.replace(/\s/g, "").toUpperCase() : null;
  input.partnerContact = normalisePhone(input.partnerContact);
  input.siteId = normaliseSiteId(input.siteId);
  return input;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Coordinates from a pasted Google Maps link or "lat, lng" text; null if none found. */
export function coordsFromText(text: string): { lat: number; lng: number } | null {
  const patterns = [/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

export function assetIdFormatError(assetType: string, assetId: string): string | null {
  if (assetType === "Swap Station" && !SWAP_ID.test(assetId)) return "A swap station ID is BS and 4 digits, e.g. BS0031.";
  if (assetType === "Fast Charger" && !CHARGER_UID.test(assetId)) return "A fast charger UID is 24 characters, 0–9 and A–F.";
  return null;
}

// ── Rules ────────────────────────────────────────────────────────────────────

export interface ValidateOptions {
  /** Every other stored asset (archived included: IDs are never reused). */
  others: ChargingAsset[];
  /** The asset being edited; absent when creating. */
  selfId?: string;
  /** Super Admin chose to keep an ID that doesn't match the usual format. */
  allowIdFormat?: boolean;
  /**
   * The asset starts a new site. Its Site ID must then be unused (archived
   * sites included); adding to an existing site shares that site's ID.
   */
  newSite?: boolean;
  today?: Date;
}

/** Every rule on one asset. Errors block saving; warnings need a confirmation. */
export function validateAsset(input: ChargingAssetInput, opts: ValidateOptions): ValidationResult {
  const errors: FieldErrors = {};
  const warnings: Warning[] = [];
  const set = (k: FieldKey, m: string) => { if (!errors[k]) errors[k] = m; };
  const others = opts.others.filter((o) => o.id !== opts.selfId);

  // Required and choices.
  for (const f of FIELDS) {
    const v = input[f.key];
    const empty = v == null || v === "" || (typeof v === "number" && Number.isNaN(v));
    if (f.required && empty) set(f.key, `${f.label} is required.`);
    if (!empty && f.options && !f.options.includes(String(v))) set(f.key, `Choose one of: ${f.options.join(", ")}.`);
  }

  // Identity.
  if (input.siteId && !SITE_ID.test(input.siteId)) set("siteId", "A site ID looks like Site-0042.");
  if (input.siteId && opts.newSite && !errors.siteId) {
    const taken = others.find((o) => norm(o.siteId) === norm(input.siteId));
    if (taken) set("siteId", `${taken.siteId} is already used by “${taken.siteName}”${others.every((o) => norm(o.siteId) !== norm(input.siteId) || o.archivedAt) ? " (archived)" : ""}. A new site needs its own ID.`);
  }
  if (input.assetId) {
    const fmt = assetIdFormatError(input.assetType, input.assetId);
    if (fmt && !opts.allowIdFormat) set("assetId", fmt);
    const clash = others.find((o) => o.assetId && norm(o.assetId) === norm(input.assetId));
    if (clash) set("assetId", `${input.assetId} is already used by “${clash.assetName}”${clash.archivedAt ? " (archived)" : ""}.`);
  }
  if (input.assetName) {
    const clash = others.find((o) => norm(o.assetName) === norm(input.assetName));
    if (clash) set("assetName", `Another asset is already called this (${clash.assetId ?? clash.siteId}).`);
  }
  if (input.siteName && input.siteId) {
    const sameName = others.find((o) => o.siteId !== input.siteId && norm(o.siteName) === norm(input.siteName));
    if (sameName) set("siteName", `${sameName.siteId} already has this name. Add the asset to that site instead.`);
  }

  // Location.
  const { lat, lng } = input;
  if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) set("lat", "Latitude is between -90 and 90.");
  if (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180)) set("lng", "Longitude is between -180 and 180.");
  const bounds = COUNTRY_BOUNDS[input.country];
  if (bounds && lat != null && lng != null && !errors.lat && !errors.lng) {
    const inside = (la: number, ln: number) => la >= bounds.lat[0] && la <= bounds.lat[1] && ln >= bounds.lng[0] && ln <= bounds.lng[1];
    if (!inside(lat, lng)) {
      set("lat", inside(lng, lat) ? "Latitude and longitude look swapped." : `This point isn’t in ${input.country}.`);
    }
  }
  if (lat != null && lng != null && !errors.lat && !errors.lng && input.assetType) {
    for (const o of others) {
      if (o.archivedAt || o.assetType !== input.assetType || o.siteId === input.siteId || o.lat == null || o.lng == null) continue;
      const m = metresBetween(lat, lng, o.lat, o.lng);
      if (m <= NEAR_METRES) {
        warnings.push({ key: "near", otherId: o.id, message: `${Math.round(m)} m from “${o.assetName}” (${o.assetId ?? "no ID"}) at ${o.siteId}. Is this the same ${input.assetType.toLowerCase()}?` });
      }
    }
  }

  // Dates.
  for (const k of ["goLiveDate", "leaseSigned", "leaseExpiry"] as const) {
    const v = input[k];
    if (v && !isIsoDate(v)) set(k, "Enter a valid date.");
  }
  if (input.leaseSigned && input.leaseExpiry && !errors.leaseSigned && !errors.leaseExpiry && input.leaseExpiry <= input.leaseSigned) {
    set("leaseExpiry", "The lease must expire after it was signed.");
  }
  if (input.goLiveDate && !errors.goLiveDate) {
    const limit = new Date(opts.today ?? new Date());
    limit.setUTCFullYear(limit.getUTCFullYear() + 1);
    if (input.goLiveDate > limit.toISOString().slice(0, 10)) set("goLiveDate", "Go-live can’t be more than a year ahead.");
  }

  // Money and formats.
  if (input.monthlyRent != null && (Number.isNaN(input.monthlyRent) || input.monthlyRent < 0)) set("monthlyRent", "Rent is a number, 0 or more.");
  if (input.partnerContact && !input.partnerContact.split(" / ").every(isValidPhone)) {
    set("partnerContact", "Use full numbers with the country code, e.g. 254712345678; separate two numbers with /.");
  }
  if (input.leaseLink && !/^https?:\/\/\S+$/i.test(input.leaseLink)) set("leaseLink", "Paste a full link starting with https://.");
  if (input.paybill && !/^\d{5,7}$/.test(input.paybill)) set("paybill", "A paybill is 5–7 digits.");

  return { errors, warnings };
}

/** Field errors as one readable line, for import notes and API messages. */
export function describeErrors(errors: FieldErrors): string {
  return Object.entries(errors).map(([k, m]) => `${FIELD_BY_KEY[k as FieldKey]?.label ?? k}: ${m}`).join(" · ");
}
