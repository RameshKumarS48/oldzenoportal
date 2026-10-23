/**
 * Seed for Custom Pricing. Kenya only, KES per kWh, all times EAT.
 *
 * Today's flat swap rate works out to ~90 KES/kWh (total_points / total_kWh on
 * the swap sample), so Default keeps 90 as its Standard rate and old swap
 * amounts stay where they were.
 */

import { SWAP_STATIONS, type SwapStation } from "@/lib/mock/kpi-infra";
import type { PlanChange, PricingPlan, StationAssignment } from "@/lib/pricing/types";

// ── Stations ─────────────────────────────────────────────────────────────────

/** Street-level address per station. The short address is the station's name. */
export const STATION_LONG_ADDRESS: Record<string, string> = {
  BS0002: "Peak Place, Kenyatta Ave, Nanyuki Town, Laikipia County",
  BS0003: "Dormans Coffee, Lumumba Rd, Nanyuki Town, Laikipia County",
  BS0005: "Nan Matt Petrol Station 1, Nanyuki–Meru Rd, Laikipia County",
  BS0006: "Zeno Hub, Kimathi Way, Nyeri Town, Nyeri County",
  BS0007: "Zeno Hub, King'ara Rd, Kiambu Rd, Kiambu County",
  BS0008: "Zeno Hub, Rungiri, Waiyaki Way, Kiambu County",
  BS0009: "Zeno Hub, Eastern Bypass, Ruai, Nairobi",
  BS0010: "Zeno Hub, Garissa Rd, Thika Town, Kiambu County",
  BS0014: "Jubilee House, Airport North Rd, Imara Daima, Nairobi",
  BS0016: "Peak Place 2, Laikipia Rd, Nanyuki Town, Laikipia County",
  BS0017: "Extra Miles, 1st Ave, Eastleigh, Nairobi",
  BS0018: "Be Energy, Kangundo Rd, Kayole, Nairobi",
  BS0019: "District Mall, Mombasa Rd, South B, Nairobi",
  BS0021: "M Square Mall, Ngong Rd, Kilimani, Nairobi",
  BS0022: "Pop Up Mall, Limuru Rd, Parklands, Nairobi",
  BS0024: "Mavuno Garage, Hospital Rd, Upperhill, Nairobi",
  BS0025: "Kasarani Hub, Thika Rd, Kasarani, Nairobi",
  BS0027: "Zeno Hub, Waiyaki Way, Westlands, Nairobi",
  BS0029: "Cumulus Suppliers, Gakere Rd, Nyeri Town, Nyeri County",
  BS0030: "Headquarters Inn, Langata Rd, Langata, Nairobi",
  BS0031: "Wabi Energy, Jogoo Rd, Makadara, Nairobi",
  BS0032: "Jam Rescue, Jogoo Rd, Buruburu, Nairobi",
  BS0033: "Quickmart, Argwings Kodhek Rd, Kilimani, Nairobi",
  BS0034: "Ngangarithi Market, Nyeri–Othaya Rd, Nyeri County",
  BS0037: "Quickmart, Limuru Rd, Ruaka, Kiambu County",
  BS0038: "Quickmart, Gatundu Rd, Kileleshwa, Nairobi",
  BS0040: "Kenya Continental Hotel, Rhapta Rd, Westlands, Nairobi",
  BS0043: "Zeno HQ, Baba Dogo Rd, Ruaraka, Nairobi",
  BS0045: "KFA Store, Naromoru Town, Nyeri County",
  BS0047: "Nan Matt Petrol Station 2, Nanyuki–Nyeri Rd, Laikipia County",
  BS0065: "One Stop Arcade, Karen Rd, Karen, Nairobi",
};

export const PRICING_REGIONS: { key: SwapStation["region"]; label: string }[] = [
  { key: "nbo", label: "Nairobi" },
  { key: "nanyuki", label: "Nanyuki" },
  { key: "nyeri", label: "Nyeri" },
];

export interface PricingStation {
  id: string;
  shortAddress: string;
  longAddress: string;
  region: SwapStation["region"];
  regionLabel: string;
}

export const PRICING_STATIONS: PricingStation[] = SWAP_STATIONS.map((s) => ({
  id: s.id,
  shortAddress: s.name,
  longAddress: STATION_LONG_ADDRESS[s.id] ?? s.location,
  region: s.region,
  regionLabel: PRICING_REGIONS.find((r) => r.key === s.region)?.label ?? s.location,
})).sort((a, b) => a.id.localeCompare(b.id));

export const ALL_STATION_IDS = PRICING_STATIONS.map((s) => s.id);

// ── Plans ────────────────────────────────────────────────────────────────────

const RAMESH = "Ramesh Kumar";
const WILLIE = "Willie Omondi";
const VIJAY = "Vijayanand P";

const NOTE_LEAD = 24;

export const SEED_PLANS: PricingPlan[] = [
  {
    id: "pp-default",
    name: "Default",
    description: "Applies to every station that isn't on another plan.",
    isDefault: true,
    createdAt: "2026-01-01T00:00:00+03:00",
    versions: [
      {
        id: "pv-default-1",
        effectiveFrom: "2026-01-01T00:00:00+03:00",
        standardRate: 90,
        customWindowStart: "22:00",
        customWindowEnd: "06:00",
        customRate: 70,
        notifyLeadHours: NOTE_LEAD,
        notificationText: "Zeno swaps cost KES 90/kWh, and KES 70/kWh between 22:00 and 06:00.",
        createdBy: RAMESH,
        createdAt: "2025-12-20T10:00:00+03:00",
      },
    ],
  },
  {
    id: "pp-nbo-cbd",
    name: "Nairobi CBD",
    description: "Busy central Nairobi stations: higher daytime rate to spread demand.",
    isDefault: false,
    createdAt: "2026-08-25T11:20:00+03:00",
    versions: [
      {
        id: "pv-nbo-cbd-1",
        effectiveFrom: "2026-09-01T00:00:00+03:00",
        standardRate: 100,
        customWindowStart: "22:00",
        customWindowEnd: "06:00",
        customRate: 70,
        notifyLeadHours: NOTE_LEAD,
        notificationText: "From 1 Sep, swaps at this station cost KES 100/kWh, and KES 70/kWh between 22:00 and 06:00.",
        createdBy: WILLIE,
        createdAt: "2026-08-25T11:20:00+03:00",
      },
      {
        id: "pv-nbo-cbd-2",
        effectiveFrom: "2026-11-15T00:00:00+03:00",
        standardRate: 105,
        customWindowStart: "22:00",
        customWindowEnd: "06:00",
        customRate: 70,
        notifyLeadHours: NOTE_LEAD,
        notificationText: "From 15 Nov, swaps at this station cost KES 105/kWh, and KES 70/kWh between 22:00 and 06:00.",
        createdBy: RAMESH,
        createdAt: "2026-10-20T09:05:00+03:00",
      },
    ],
  },
  {
    id: "pp-upcountry",
    name: "Upcountry Saver",
    description: "Lower rates for Nanyuki and Nyeri riders.",
    isDefault: false,
    createdAt: "2026-09-08T14:00:00+03:00",
    versions: [
      {
        id: "pv-upcountry-1",
        effectiveFrom: "2026-09-15T00:00:00+03:00",
        standardRate: 80,
        customWindowStart: "22:00",
        customWindowEnd: "06:00",
        customRate: 60,
        notifyLeadHours: NOTE_LEAD,
        notificationText: "Good news: from 15 Sep, swaps here cost KES 80/kWh, and KES 60/kWh between 22:00 and 06:00.",
        createdBy: VIJAY,
        createdAt: "2026-09-08T14:00:00+03:00",
      },
    ],
  },
  {
    id: "pp-night-rider",
    name: "Night Rider Promo",
    description: "Deep late-night rate for night-shift riders at three Nairobi hubs.",
    isDefault: false,
    createdAt: "2026-09-05T16:45:00+03:00",
    versions: [
      {
        id: "pv-night-rider-1",
        effectiveFrom: "2026-09-10T00:00:00+03:00",
        standardRate: 90,
        customWindowStart: "23:00",
        customWindowEnd: "05:00",
        customRate: 55,
        notifyLeadHours: NOTE_LEAD,
        notificationText: "Night Rider: from 10 Sep, swap here between 23:00 and 05:00 for KES 55/kWh.",
        createdBy: RAMESH,
        createdAt: "2026-09-05T16:45:00+03:00",
      },
    ],
  },
  {
    id: "pp-nov-revision",
    name: "Nov 2026 Revision",
    description: "Revised rates for the Quickmart stations, starting 1 Nov.",
    isDefault: false,
    createdAt: "2026-10-21T15:30:00+03:00",
    versions: [
      {
        id: "pv-nov-revision-1",
        effectiveFrom: "2026-11-01T00:00:00+03:00",
        standardRate: 95,
        customWindowStart: "22:00",
        customWindowEnd: "06:00",
        customRate: 65,
        notifyLeadHours: NOTE_LEAD,
        notificationText: "From 1 Nov, swaps at this station cost KES 95/kWh, and KES 65/kWh between 22:00 and 06:00.",
        createdBy: WILLIE,
        createdAt: "2026-10-21T15:30:00+03:00",
      },
    ],
  },
];

// ── Assignments ──────────────────────────────────────────────────────────────

function assign(planId: string, ids: string[], effectiveFrom: string, by: string, at: string): StationAssignment[] {
  return ids.map((stationId) => ({
    id: `sa-${planId}-${stationId}-${effectiveFrom.slice(0, 10)}`,
    stationId,
    planId,
    effectiveFrom,
    assignedBy: by,
    assignedAt: at,
  }));
}

const CBD = ["BS0021", "BS0022", "BS0024", "BS0027", "BS0040"];
const UPCOUNTRY = PRICING_STATIONS.filter((s) => s.region !== "nbo").map((s) => s.id);
const NIGHT_RIDER = ["BS0009", "BS0025", "BS0043"];
const QUICKMART = ["BS0033", "BS0037", "BS0038"];

export const SEED_ASSIGNMENTS: StationAssignment[] = [
  ...assign("pp-nbo-cbd", CBD, "2026-09-01T00:00:00+03:00", WILLIE, "2026-08-25T11:24:00+03:00"),
  ...assign("pp-upcountry", UPCOUNTRY, "2026-09-15T00:00:00+03:00", VIJAY, "2026-09-08T14:06:00+03:00"),
  ...assign("pp-night-rider", NIGHT_RIDER, "2026-09-10T00:00:00+03:00", RAMESH, "2026-09-05T16:50:00+03:00"),
  ...assign("pp-nov-revision", QUICKMART, "2026-11-01T00:00:00+03:00", WILLIE, "2026-10-21T15:34:00+03:00"),
];

// ── Change history ───────────────────────────────────────────────────────────

export const SEED_CHANGES: PlanChange[] = [
  { id: "pc-01", planId: "pp-default", at: "2025-12-20T10:00:00+03:00", by: RAMESH, kind: "created",
    summary: "Created Default: Standard KES 90/kWh, Custom window 22:00–06:00 at KES 70/kWh", effectiveFrom: "2026-01-01T00:00:00+03:00" },

  { id: "pc-02", planId: "pp-nbo-cbd", at: "2026-08-25T11:20:00+03:00", by: WILLIE, kind: "created",
    summary: "Created plan: Standard KES 100/kWh, Custom window 22:00–06:00 at KES 70/kWh", effectiveFrom: "2026-09-01T00:00:00+03:00" },
  { id: "pc-03", planId: "pp-nbo-cbd", at: "2026-08-25T11:24:00+03:00", by: WILLIE, kind: "stations_assigned",
    summary: `Assigned 5 stations: ${CBD.join(", ")}`, effectiveFrom: "2026-09-01T00:00:00+03:00" },
  { id: "pc-04", planId: "pp-nbo-cbd", at: "2026-10-20T09:05:00+03:00", by: RAMESH, kind: "rates_changed",
    summary: "Standard rate KES 100 → 105/kWh", effectiveFrom: "2026-11-15T00:00:00+03:00" },

  { id: "pc-05", planId: "pp-upcountry", at: "2026-09-08T14:00:00+03:00", by: VIJAY, kind: "created",
    summary: "Created plan: Standard KES 80/kWh, Custom window 22:00–06:00 at KES 60/kWh", effectiveFrom: "2026-09-15T00:00:00+03:00" },
  { id: "pc-06", planId: "pp-upcountry", at: "2026-09-08T14:06:00+03:00", by: VIJAY, kind: "stations_assigned",
    summary: `Assigned all Nanyuki and Nyeri stations (${UPCOUNTRY.length})`, effectiveFrom: "2026-09-15T00:00:00+03:00" },

  { id: "pc-07", planId: "pp-night-rider", at: "2026-09-05T16:45:00+03:00", by: RAMESH, kind: "created",
    summary: "Created plan: Standard KES 90/kWh, Custom window 23:00–05:00 at KES 55/kWh", effectiveFrom: "2026-09-10T00:00:00+03:00" },
  { id: "pc-08", planId: "pp-night-rider", at: "2026-09-05T16:50:00+03:00", by: RAMESH, kind: "stations_assigned",
    summary: `Assigned 3 stations: ${NIGHT_RIDER.join(", ")}`, effectiveFrom: "2026-09-10T00:00:00+03:00" },

  { id: "pc-09", planId: "pp-nov-revision", at: "2026-10-21T15:30:00+03:00", by: WILLIE, kind: "created",
    summary: "Created plan: Standard KES 95/kWh, Custom window 22:00–06:00 at KES 65/kWh", effectiveFrom: "2026-11-01T00:00:00+03:00" },
  { id: "pc-10", planId: "pp-nov-revision", at: "2026-10-21T15:34:00+03:00", by: WILLIE, kind: "stations_assigned",
    summary: `Assigned 3 stations: ${QUICKMART.join(", ")}`, effectiveFrom: "2026-11-01T00:00:00+03:00" },
];
