/**
 * Zeno Charging: one record per charging asset (a swap station or a fast
 * charger), grouped into sites, as in the "Zeno Charging Database" sheet it
 * replaces. This file is the single description of every field: the form,
 * validation, the database mapping, the importer and the exports all read it.
 *
 * Required vs optional follows how the sheet was actually filled: a column
 * filled in at least 95% of rows is required; anything else is optional.
 */

export const ASSET_TYPES = ["Swap Station", "Fast Charger"] as const;
export const COMMISSION_STATUSES = ["Commissioned", "Decommissioned"] as const;
export const ACCESS_TYPES = ["Public", "Restricted", "Internal"] as const;
export const COUNTRIES = ["Kenya", "Uganda", "India"] as const;
export const ZONES = ["1", "2A", "2B", "3"] as const;
export const PAYMENT_FREQUENCIES = ["Monthly", "Quarterly"] as const;
export const PHASE_TYPES = ["Single Phase", "Three Phase"] as const;
export const ELECTRICITY_SERVICE_TYPES = ["Post-paid to Landlord", "Post-Paid Direct to KPLC", "Pre-paid"] as const;
export const EV_TARIFF_STATUSES = ["Active", "Not active"] as const;
export const YES_NO = ["Yes", "No"] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

/** Everything a person fills in. Empty optional fields are null. */
export interface ChargingAssetInput {
  // 1. Site & location
  siteId: string;
  siteName: string;
  landmark: string;
  area: string;
  road: string;
  town: string;
  country: string;
  legacyName: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  // 2. Asset
  assetId: string | null;
  assetType: string;
  assetName: string;
  commissionStatus: string;
  accessType: string;
  goLiveDate: string | null;
  operationalHours: string | null;
  // 3. Site partner & lease
  partnerName: string | null;
  partnerContact: string | null;
  leaseSigned: string | null;
  leaseExpiry: string | null;
  leaseLink: string | null;
  // 4. Rent & payment
  monthlyRent: number | null;
  paymentFrequency: string;
  agreementName: string | null;
  paymentDetails: string | null;
  etimsActive: string | null;
  paybill: string | null;
  accountNumber: string | null;
  // 5. Electricity
  phaseType: string;
  electricityServiceType: string;
  evTariffStatus: string;
  meterNumber: string | null;
}

/** A stored asset: the input plus identity, state and who changed it. */
export interface ChargingAsset extends ChargingAssetInput {
  /** Internal id; never changes, unlike the Asset ID. */
  id: string;
  version: number;
  /** Why this record needs fixing (missing or invalid values from the sheet); null when it's clean. */
  needsAttention: string | null;
  archivedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type FieldKey = keyof ChargingAssetInput;
export type FieldKind = "text" | "choice" | "date" | "money" | "lat" | "lng" | "phone" | "url" | "digits" | "longtext";

export const SECTIONS = [
  { id: "site", title: "Site & location", hint: "Where the asset is. Assets at the same site share these." },
  { id: "asset", title: "Asset", hint: "The swap station or fast charger itself." },
  { id: "lease", title: "Site partner & lease", hint: "Who hosts the site and the lease." },
  { id: "payment", title: "Rent & payment", hint: "What Zeno pays for the site, and how." },
  { id: "electricity", title: "Electricity", hint: "Power supply and metering." },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];

export interface FieldDef {
  key: FieldKey;
  label: string;
  section: SectionId;
  required: boolean;
  kind: FieldKind;
  options?: readonly string[];
  /** The column in the Charging Asset Master sheet. */
  sheet: string;
  /** The column in D1. */
  column: string;
  placeholder?: string;
  help?: string;
  /** Shared by every asset at a site: picking an existing site pre-fills it. */
  siteLevel?: boolean;
}

export const FIELDS: FieldDef[] = [
  // 1. Site & location
  { key: "siteId", label: "Site ID", section: "site", required: true, kind: "text", sheet: "Site ID", column: "site_id", siteLevel: true },
  { key: "siteName", label: "Site name", section: "site", required: true, kind: "text", sheet: "Site Name", column: "site_name", placeholder: "Zeno Hub Westlands, Mpaka Rd, Nairobi", help: "Landmark, road, town.", siteLevel: true },
  { key: "landmark", label: "Landmark / familiar name", section: "site", required: true, kind: "text", sheet: "Landmark/Familiar Name", column: "landmark", placeholder: "Zeno Hub Westlands", help: "Shown to riders in the app.", siteLevel: true },
  { key: "area", label: "Neighbourhood / town area", section: "site", required: true, kind: "text", sheet: "Common Neighbourhood/Main Town Area", column: "area", placeholder: "Westlands", siteLevel: true },
  { key: "road", label: "Road", section: "site", required: true, kind: "text", sheet: "Common Rd", column: "road", placeholder: "Mpaka Rd", siteLevel: true },
  { key: "town", label: "Town or city", section: "site", required: true, kind: "text", sheet: "Town or City", column: "town", placeholder: "Nairobi", siteLevel: true },
  { key: "country", label: "Country", section: "site", required: true, kind: "choice", options: COUNTRIES, sheet: "Country", column: "country", siteLevel: true },
  { key: "lat", label: "Latitude", section: "site", required: true, kind: "lat", sheet: "Latitude", column: "lat", placeholder: "-1.264197", help: "Or paste a Google Maps link." },
  { key: "lng", label: "Longitude", section: "site", required: true, kind: "lng", sheet: "Longitude", column: "lng", placeholder: "36.805391" },
  { key: "zone", label: "Zone", section: "site", required: false, kind: "choice", options: ZONES, sheet: "Zone", column: "zone", siteLevel: true },
  { key: "legacyName", label: "Legacy name", section: "site", required: false, kind: "text", sheet: "Legacy Name", column: "legacy_name", help: "An older name people may still use." },
  // 2. Asset
  { key: "assetType", label: "Asset type", section: "asset", required: true, kind: "choice", options: ASSET_TYPES, sheet: "Asset Type", column: "asset_type" },
  { key: "assetId", label: "Asset ID (BS code / UID)", section: "asset", required: true, kind: "text", sheet: "Asset ID ( (BSCode / UID)", column: "asset_id", help: "Swap stations: BS and 4 digits (BS0031). Fast chargers: the 24-character UID." },
  { key: "assetName", label: "Asset name", section: "asset", required: true, kind: "text", sheet: "Asset Name", column: "asset_name", help: "Site name and asset, e.g. “… - Fast Charger 2”. Filled in for you." },
  { key: "commissionStatus", label: "Commission status", section: "asset", required: true, kind: "choice", options: COMMISSION_STATUSES, sheet: "Commission Status", column: "commission_status" },
  { key: "accessType", label: "Access type", section: "asset", required: true, kind: "choice", options: ACCESS_TYPES, sheet: "Access Type", column: "access_type", help: "Only Public, commissioned assets appear in the app and on the website." },
  { key: "goLiveDate", label: "Install go-live date", section: "asset", required: true, kind: "date", sheet: "Install Go-Live Date", column: "go_live_date" },
  { key: "operationalHours", label: "Operational hours", section: "asset", required: false, kind: "text", sheet: "Operational Hours", column: "operational_hours", placeholder: "24 hours, or 6:00–22:00", help: "Shown in the app and on the website." },
  // 3. Site partner & lease
  { key: "partnerName", label: "Site partner name", section: "lease", required: false, kind: "text", sheet: "Site Partner Name", column: "partner_name", siteLevel: true },
  { key: "partnerContact", label: "Site partner phone", section: "lease", required: false, kind: "phone", sheet: "Site Partner Contact", column: "partner_contact", placeholder: "254712345678", siteLevel: true },
  { key: "leaseSigned", label: "Lease signed", section: "lease", required: false, kind: "date", sheet: "Lease Signed Date", column: "lease_signed", siteLevel: true },
  { key: "leaseExpiry", label: "Lease expiry", section: "lease", required: false, kind: "date", sheet: "Lease Expiry Date", column: "lease_expiry", siteLevel: true },
  { key: "leaseLink", label: "Link to lease", section: "lease", required: false, kind: "url", sheet: "Link to Lease", column: "lease_link", placeholder: "https://zenomoto.atlassian.net/…", siteLevel: true },
  // 4. Rent & payment
  { key: "monthlyRent", label: "Monthly rent per site", section: "payment", required: true, kind: "money", sheet: "Total Monthly Rent Per Site (KES)", column: "monthly_rent", help: "In the site's local currency (KES in Kenya).", siteLevel: true },
  { key: "paymentFrequency", label: "Payment frequency", section: "payment", required: true, kind: "choice", options: PAYMENT_FREQUENCIES, sheet: "Payment Frequency", column: "payment_frequency", siteLevel: true },
  { key: "agreementName", label: "Agreement name (for payment)", section: "payment", required: false, kind: "text", sheet: "Agreement Name (for Payment)", column: "agreement_name", siteLevel: true },
  { key: "paybill", label: "Paybill", section: "payment", required: false, kind: "digits", sheet: "Paybill", column: "paybill", siteLevel: true },
  { key: "accountNumber", label: "Account number", section: "payment", required: false, kind: "text", sheet: "Account Number", column: "account_number", siteLevel: true },
  { key: "paymentDetails", label: "Payment details", section: "payment", required: false, kind: "longtext", sheet: "Payment Details", column: "payment_details", siteLevel: true },
  { key: "etimsActive", label: "E-TIMS active", section: "payment", required: false, kind: "choice", options: YES_NO, sheet: "E_Tims Active", column: "etims_active", siteLevel: true },
  // 5. Electricity
  { key: "phaseType", label: "Phase type", section: "electricity", required: true, kind: "choice", options: PHASE_TYPES, sheet: "Phase Type", column: "phase_type" },
  { key: "electricityServiceType", label: "Electricity service type", section: "electricity", required: true, kind: "choice", options: ELECTRICITY_SERVICE_TYPES, sheet: "Electricity Service Type", column: "electricity_service_type" },
  { key: "evTariffStatus", label: "EV tariff application", section: "electricity", required: true, kind: "choice", options: EV_TARIFF_STATUSES, sheet: "EV Tariff Application Status", column: "ev_tariff_status" },
  { key: "meterNumber", label: "Meter number", section: "electricity", required: false, kind: "text", sheet: "Meter Number", column: "meter_number" },
];

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<FieldKey, FieldDef>;
export const SITE_LEVEL_KEYS = FIELDS.filter((f) => f.siteLevel && f.key !== "siteId").map((f) => f.key);

/** Google Maps link for a point; derived, never typed. */
export function mapsUrl(lat: number | null, lng: number | null): string | null {
  return lat == null || lng == null ? null : `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Comparison key for IDs and names: trimmed, single spaces, case-insensitive. */
export function norm(s: string | null | undefined): string {
  return (s ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Shown in the app and on the website: commissioned, public, not archived. */
export function isPublic(a: Pick<ChargingAsset, "commissionStatus" | "accessType" | "archivedAt">): boolean {
  return a.commissionStatus === "Commissioned" && a.accessType === "Public" && !a.archivedAt;
}

export function emptyInput(): ChargingAssetInput {
  return {
    siteId: "", siteName: "", landmark: "", area: "", road: "", town: "", country: "Kenya", legacyName: null, zone: null, lat: null, lng: null,
    assetId: null, assetType: "", assetName: "", commissionStatus: "Commissioned", accessType: "Public", goLiveDate: null, operationalHours: null,
    partnerName: null, partnerContact: null, leaseSigned: null, leaseExpiry: null, leaseLink: null,
    monthlyRent: null, paymentFrequency: "Monthly", agreementName: null, paymentDetails: null, etimsActive: null, paybill: null, accountNumber: null,
    phaseType: "", electricityServiceType: "", evTariffStatus: "", meterNumber: null,
  };
}

/** The next free site ID, e.g. Site-0205. */
export function nextSiteId(existing: string[]): string {
  const max = existing.reduce((m, id) => Math.max(m, Number(/^Site-(\d+)$/.exec(id)?.[1] ?? 0)), 0);
  return `Site-${String(max + 1).padStart(4, "0")}`;
}
