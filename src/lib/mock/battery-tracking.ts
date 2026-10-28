/**
 * Battery Tracking: a fixed sample of the batteries the dev portal lists.
 *
 * The five fields that page shows, plus the asset each battery sits in.
 * Last Seen is stored as minutes before the page loads, so the "Not seen in…"
 * presets always split the rows the same way: 24 seen in the last 24 h, 31 in
 * 1–7 days, 34 in 7–30 days and 31 in 30–45 days. `batteriesAt` turns it into
 * the text the dev portal shows, in UTC ("15 Oct 2026 09:56"). `location` is
 * "lat, long", or "" for the 3 batteries that have never reported one, and
 * `region` is worked out from it (regionAt); `soc` is null where the battery hasn't reported one. The first
 * eight rows are the dev portal's own (its freshest); the rest follow their format.
 *
 * Assets: 15 swap stations holding 5–8 batteries each, one per slot, 15 vehicles holding
 * exactly 2, and 12 batteries (10%) in neither. The vehicles are the first 15
 * of Vehicle Tracking's mock fleet, so a VIN here finds the same bike there.
 */

/** A station or vehicle, as a search or link names it. */
export type AssetRef = { type: "station"; code: string } | { type: "vehicle"; vin: string };

/** What holds a battery: a vehicle, or a station and the slot (1–8, unique per station) it's in. */
export type BatteryAsset = { type: "station"; code: string; slot: number } | { type: "vehicle"; vin: string };

export interface BatteryRecord {
  serialNo: string;
  imei: string;
  /** UTC, "15 Oct 2026 09:56". */
  lastSeen: string;
  /** "lat, long", or "" when the battery has never reported a location. */
  location: string;
  /** Where the location falls; null when there is no location. */
  region: BatteryRegion | null;
  soc: number | null;
  /** Null when the battery is in neither a vehicle nor a station. */
  asset: BatteryAsset | null;
}

export type Region = "Nairobi" | "Kiambu" | "Machakos" | "Kajiado" | "Nanyuki" | "Nyeri";

/** A battery's region: one of the station regions, or "Outside service regions" outside them all. */
export type BatteryRegion = Region | "Outside service regions";
export const OTHER_AREA = "Outside service regions";

/**
 * The region a "lat, long" falls in, from rough boxes around each region's
 * stations: Nanyuki and Nyeri by latitude, Kiambu around Thika and Ruaka,
 * Machakos around Machakos Town and Syokimau, Kajiado south of Nairobi, and
 * Nairobi the city itself. Anywhere else is "Outside service regions"; no location, null.
 */
export function regionAt(location: string): BatteryRegion | null {
  const [lat, lng] = location.split(",").map(Number);
  if (!location.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const within = (s: number, n: number, w: number, e: number) => lat >= s && lat <= n && lng >= w && lng <= e;
  if (within(-0.1, 0.2, 36.9, 37.2)) return "Nanyuki";
  if (within(-0.7, -0.1, 36.85, 37.15)) return "Nyeri";
  if (within(-1.12, -0.95, 36.95, 37.2) || within(-1.23, -1.18, 36.74, 36.8)) return "Kiambu";
  if (within(-1.56, -1.45, 37.2, 37.3) || within(-1.37, -1.35, 36.915, 36.93)) return "Machakos";
  if (within(-1.55, -1.38, 36.7, 37.0)) return "Kajiado";
  if (within(-1.38, -1.18, 36.74, 36.96)) return "Nairobi";
  return OTHER_AREA;
}

export interface SwapStation {
  /** "BS0025", no space. */
  code: string;
  /** A landmark and road, enough to place it: "District Mall, Mombasa Rd". */
  shortAddress: string;
  /** The full postal address. */
  longAddress: string;
  region: Region;
}

export interface AssetVehicle {
  /** 17 characters. */
  vin: string;
  plate: string;
  model: string;
  /** The vehicle's own telematics IMEI, not a battery's. */
  imei: string;
  /**
   * Where the vehicle itself last reported. Its batteries report their own
   * locations, so three vehicles (KMGY148Y, KMGP341K, KMGV088Q) are in a
   * different region from their batteries.
   */
  region: BatteryRegion;
}

/** Codes follow the swap-station list in kpi-infra; Machakos and Kajiado have none there, so theirs are new codes. */
export const STATIONS: SwapStation[] = [
  { code: "BS0025", shortAddress: "Kasarani Stadium, Thika Rd", longAddress: "Thika Rd, next to Kasarani Stadium, Kasarani, Nairobi, Kenya", region: "Nairobi" },
  { code: "BS0027", shortAddress: "Waiyaki Way, Westlands", longAddress: "Waiyaki Way, Westlands, Nairobi, Kenya", region: "Nairobi" },
  { code: "BS0019", shortAddress: "District Mall, Mombasa Rd", longAddress: "District Mall, Mombasa Rd, Embakasi, Nairobi, Kenya", region: "Nairobi" },
  { code: "BS0043", shortAddress: "Baba Dogo Rd, Ruaraka", longAddress: "Baba Dogo Rd, Ruaraka, Nairobi, Kenya", region: "Nairobi" },
  { code: "BS0010", shortAddress: "Kenyatta Hwy, Thika Town", longAddress: "Kenyatta Hwy, Thika Town, Kiambu, Kenya", region: "Kiambu" },
  { code: "BS0007", shortAddress: "Thika–Gatundu Rd, King'ara", longAddress: "Thika–Gatundu Rd, King'ara, Kiambu, Kenya", region: "Kiambu" },
  { code: "BS0037", shortAddress: "Quickmart, Limuru Rd, Ruaka", longAddress: "Limuru Rd, Ruaka, Kiambu, Kenya", region: "Kiambu" },
  { code: "BS0051", shortAddress: "Gateway Mall, Syokimau", longAddress: "Mombasa Rd, Syokimau, Machakos, Kenya", region: "Machakos" },
  { code: "BS0052", shortAddress: "Ngei Rd, Machakos Town", longAddress: "Ngei Rd, Machakos Town, Machakos, Kenya", region: "Machakos" },
  { code: "BS0053", shortAddress: "Namanga Rd, Kitengela", longAddress: "Namanga Rd, Kitengela, Kajiado, Kenya", region: "Kajiado" },
  { code: "BS0054", shortAddress: "Maasai Mall, Ongata Rongai", longAddress: "Magadi Rd, Ongata Rongai, Kajiado, Kenya", region: "Kajiado" },
  { code: "BS0005", shortAddress: "Nan Matt 1, Kenyatta Ave, Nanyuki", longAddress: "Kenyatta Ave, Nanyuki, Laikipia, Kenya", region: "Nanyuki" },
  { code: "BS0003", shortAddress: "Dormans, Nanyuki–Nyeri Rd", longAddress: "Nanyuki–Nyeri Rd, Nanyuki, Laikipia, Kenya", region: "Nanyuki" },
  { code: "BS0006", shortAddress: "Kimathi Way, Nyeri Town", longAddress: "Kimathi Way, Nyeri Town, Nyeri, Kenya", region: "Nyeri" },
  { code: "BS0034", shortAddress: "Nyeri–Othaya Rd, Ngangarithi", longAddress: "Nyeri–Othaya Rd, Ngangarithi, Nyeri, Kenya", region: "Nyeri" },
];

/** VIN, plate and IMEI as in Vehicle Tracking's mock fleet (store/asset-tracking.ts). */
export const VEHICLES: AssetVehicle[] = [
  { vin: "ME92ZPSBB1J000760", plate: "KMGY105Z", model: "Zeno Emflux", imei: "867963074737462", region: "Nyeri" },
  { vin: "ME92ZPSDB1J001111", plate: "KMHA287J", model: "Zeno Emflux", imei: "860851086846248", region: "Nanyuki" },
  { vin: "ME92ZPSAB1J000542", plate: "KMGX871S", model: "Zeno Cargo", imei: "861685072590637", region: "Nyeri" },
  { vin: "ME92ZPSFA1J000112", plate: "KMGS080M", model: "Zeno Emflux", imei: "863406078890972", region: "Nyeri" },
  { vin: "ME92ZPSBB1J000817", plate: "KMGY148Y", model: "Zeno Emflux", imei: "867963074737082", region: "Nanyuki" },
  { vin: "ME92ZPSFA1J000103", plate: "KMGS108M", model: "Zeno Cargo", imei: "867963074743957", region: "Nyeri" },
  { vin: "ESUM0220522000030", plate: "KMGQ026X", model: "Zeno Emflux", imei: "863406076615124", region: "Nairobi" },
  { vin: "ME92ZPSLA1J000164", plate: "KMGU127A", model: "Zeno Cargo", imei: "867963074742215", region: "Nairobi" },
  { vin: "ME92ZPSBB1J000840", plate: "KMGY155Y", model: "Zeno Emflux", imei: "867963074737918", region: "Nairobi" },
  { vin: "ME92ZPSDA2J000073", plate: "KMGR271V", model: "Zeno Emflux", imei: "867963074744104", region: "Nyeri" },
  { vin: "ME92ZPSFB1J002180", plate: "KMHC028L", model: "Zeno Cargo", imei: "860300087747385", region: "Nanyuki" },
  { vin: "ME92ZPSBC1J001033", plate: "KMGP341K", model: "Zeno Emflux", imei: "864123056782341", region: "Nairobi" },
  { vin: "ME92ZPSCC1J001245", plate: "KMGT217R", model: "Zeno Emflux", imei: "865234167890452", region: "Nairobi" },
  { vin: "ME92ZPSFD1J002310", plate: "KMHB019P", model: "Zeno Cargo", imei: "867345289012567", region: "Nairobi" },
  { vin: "ME92ZPSAA2J000089", plate: "KMGV088Q", model: "Zeno Emflux", imei: "863789012456789", region: "Kajiado" },
];

export const stationByCode = (code: string) => STATIONS.find((s) => s.code === code);
export const vehicleByVin = (vin: string) => VEHICLES.find((v) => v.vin === vin);

const S = (code: string, slot: number): BatteryAsset => ({ type: "station", code, slot });
const V = (vin: string): BatteryAsset => ({ type: "vehicle", vin });

type MockRow = Omit<BatteryRecord, "lastSeen" | "region"> & { seenMinutesAgo: number };

const ROWS: MockRow[] = [
  { serialNo: "2ME9YBSP1C002378", imei: "864312084644982", seenMinutesAgo: 48, location: "-1.33069, 36.85595", soc: null, asset: S("BS0019", 6) },
  { serialNo: "2ME9YBSP1C010509", imei: "860300085097171", seenMinutesAgo: 677, location: "-0.43361, 36.96979", soc: null, asset: V("ME92ZPSBB1J000760") },
  { serialNo: "2ME9YBRP1B000417", imei: "867963074717373", seenMinutesAgo: 654, location: "0.02528, 37.05131", soc: null, asset: S("BS0003", 5) },
  { serialNo: "2ME9YBSP1C008434", imei: "860851088591800", seenMinutesAgo: 797, location: "-1.31819, 36.89030", soc: null, asset: V("ESUM0220522000030") },
  { serialNo: "2ME9YBSP1C010602", imei: "860300085096827", seenMinutesAgo: 1091, location: "0.01530, 37.07411", soc: null, asset: null },
  { serialNo: "2ME9YBRP1B000849", imei: "864714067521733", seenMinutesAgo: 1358, location: "-1.28540, 36.77047", soc: null, asset: S("BS0027", 2) },
  { serialNo: "2ME9YBSP1C001347", imei: "864312084831878", seenMinutesAgo: 1104, location: "-0.43450, 36.94620", soc: null, asset: S("BS0034", 1) },
  { serialNo: "2ME9YBRP1B000824", imei: "867963074858557", seenMinutesAgo: 1299, location: "-0.58154, 37.05830", soc: null, asset: S("BS0034", 6) },
  { serialNo: "2ME9YBSP1C010198", imei: "860300085610477", seenMinutesAgo: 26774, location: "-0.36867, 36.97590", soc: 78, asset: V("ME92ZPSBB1J000817") },
  { serialNo: "2ME9YBSP1C005999", imei: "864312084034479", seenMinutesAgo: 14033, location: "-0.43042, 36.97402", soc: 31, asset: V("ME92ZPSBB1J000760") },
  { serialNo: "2ME9YBSP1C001182", imei: "867963074216217", seenMinutesAgo: 42398, location: "-0.02383, 37.06686", soc: null, asset: S("BS0005", 2) },
  { serialNo: "2ME9YBSP1C009341", imei: "860851088279791", seenMinutesAgo: 7592, location: "-1.08764, 37.07026", soc: 100, asset: S("BS0007", 8) },
  { serialNo: "2ME9YBSP1C001215", imei: "860851088632480", seenMinutesAgo: 4905, location: "-0.57323, 37.10205", soc: 48, asset: V("ME92ZPSAB1J000542") },
  { serialNo: "2ME9YBSP1C006789", imei: "867963074683766", seenMinutesAgo: 54742, location: "-0.99236, 37.03123", soc: null, asset: S("BS0010", 7) },
  { serialNo: "2ME9YBRP1B000121", imei: "860300085591282", seenMinutesAgo: 20330, location: "-0.02603, 37.01984", soc: 94, asset: S("BS0005", 4) },
  { serialNo: "2ME9YBSP1C005823", imei: "864714067123536", seenMinutesAgo: 63754, location: "0.06502, 37.08262", soc: 61, asset: null },
  { serialNo: "2ME9YBSP1C008693", imei: "864312084255628", seenMinutesAgo: 1746, location: "0.05993, 37.04559", soc: null, asset: S("BS0003", 4) },
  { serialNo: "2ME9YBRP1B000178", imei: "860300085148927", seenMinutesAgo: 5560, location: "-0.37726, 36.95371", soc: null, asset: S("BS0006", 3) },
  { serialNo: "2ME9YBRP1B000136", imei: "860300085823026", seenMinutesAgo: 59612, location: "0.00282, 37.01688", soc: 72, asset: S("BS0003", 6) },
  { serialNo: "2ME9YBSP1C003866", imei: "864714067701977", seenMinutesAgo: 8417, location: "-0.63794, 37.03724", soc: null, asset: S("BS0034", 3) },
  { serialNo: "2ME9YBSP1C001880", imei: "864714067035050", seenMinutesAgo: 29363, location: "-0.52198, 37.02082", soc: null, asset: S("BS0034", 5) },
  { serialNo: "2ME9YBSP1C007189", imei: "864312084211598", seenMinutesAgo: 50108, location: "0.03820, 37.03363", soc: null, asset: V("ME92ZPSDB1J001111") },
  { serialNo: "2ME9YBRP1B000788", imei: "864714067128465", seenMinutesAgo: 56812, location: "-0.47357, 36.95428", soc: 12, asset: V("ME92ZPSFA1J000103") },
  { serialNo: "2ME9YBSP1C003779", imei: "864714067696936", seenMinutesAgo: 55850, location: "-0.60342, 36.99739", soc: 24, asset: S("BS0034", 7) },
  { serialNo: "2ME9YBSP1C006062", imei: "864714067162669", seenMinutesAgo: 7696, location: "-0.41106, 36.94725", soc: null, asset: S("BS0006", 7) },
  { serialNo: "2ME9YBSP1C010315", imei: "867963074369585", seenMinutesAgo: 3820, location: "-1.05883, 37.11249", soc: 89, asset: S("BS0010", 6) },
  { serialNo: "2ME9YBSP1C006247", imei: "860851088964091", seenMinutesAgo: 39959, location: "0.03017, 37.12085", soc: null, asset: S("BS0005", 3) },
  { serialNo: "2ME9YBSP1C004887", imei: "860300085889547", seenMinutesAgo: 2885, location: "-1.09834, 37.04852", soc: null, asset: null },
  { serialNo: "2ME9YBSP1C003945", imei: "867963074145059", seenMinutesAgo: 61584, location: "-0.47464, 36.93850", soc: null, asset: V("ME92ZPSFA1J000103") },
  { serialNo: "2ME9YBSP1C006883", imei: "864714067603643", seenMinutesAgo: 7768, location: "-0.62036, 37.06036", soc: null, asset: S("BS0034", 2) },
  { serialNo: "2ME9YBSP1C008555", imei: "860851088115140", seenMinutesAgo: 45256, location: "-0.44385, 36.91514", soc: null, asset: S("BS0034", 4) },
  { serialNo: "2ME9YBSP1C002362", imei: "864714067064932", seenMinutesAgo: 60110, location: "-0.56582, 37.09590", soc: null, asset: V("ME92ZPSAB1J000542") },
  { serialNo: "2ME9YBSP1C009437", imei: "864714067217036", seenMinutesAgo: 12010, location: "-1.34812, 36.83718", soc: 19, asset: S("BS0019", 7) },
  { serialNo: "2ME9YBSP1C004054", imei: "864312084519662", seenMinutesAgo: 29014, location: "-0.41670, 36.99019", soc: null, asset: S("BS0006", 1) },
  { serialNo: "2ME9YBSP1C009921", imei: "864714067646916", seenMinutesAgo: 53658, location: "-0.37718, 37.00321", soc: null, asset: S("BS0006", 5) },
  { serialNo: "2ME9YBRP1B000259", imei: "860851088515513", seenMinutesAgo: 53088, location: "-0.39151, 36.92477", soc: 55, asset: S("BS0006", 8) },
  { serialNo: "2ME9YBRP1B000255", imei: "860851088850115", seenMinutesAgo: 21129, location: "0.04924, 37.02936", soc: 0, asset: S("BS0003", 8) },
  { serialNo: "2ME9YBSP1C006171", imei: "864312084630180", seenMinutesAgo: 4466, location: "-1.29456, 36.82605", soc: 8, asset: S("BS0027", 7) },
  { serialNo: "2ME9YBSP1C001377", imei: "860851088266424", seenMinutesAgo: 1634, location: "-1.05608, 37.05015", soc: null, asset: null },
  { serialNo: "2ME9YBSP1C003036", imei: "860851088762738", seenMinutesAgo: 1279, location: "-1.32598, 36.82538", soc: 42, asset: S("BS0019", 2) },
  { serialNo: "2ME9YBSP1C007676", imei: "864312084937349", seenMinutesAgo: 52389, location: "-1.04697, 37.02734", soc: null, asset: S("BS0007", 6) },
  { serialNo: "2ME9YBSP1C008869", imei: "864312084573377", seenMinutesAgo: 2285, location: "-0.62868, 37.01554", soc: null, asset: V("ME92ZPSFA1J000112") },
  { serialNo: "2ME9YBSP1C008299", imei: "864312084220195", seenMinutesAgo: 826, location: "-0.38264, 36.97351", soc: 97, asset: V("ME92ZPSBB1J000817") },
  { serialNo: "2ME9YBSP1C009403", imei: "860300085521634", seenMinutesAgo: 16843, location: "-1.07936, 37.04312", soc: 3, asset: S("BS0007", 4) },
  { serialNo: "2ME9YBRP1B000430", imei: "864714067259643", seenMinutesAgo: 10303, location: "-1.32382, 36.87362", soc: 83, asset: V("ESUM0220522000030") },
  { serialNo: "2ME9YBSP1C002049", imei: "860300085804514", seenMinutesAgo: 7405, location: "-0.62109, 37.10941", soc: null, asset: S("BS0034", 8) },
  { serialNo: "2ME9YBRP1B000413", imei: "864312084282923", seenMinutesAgo: 28352, location: "-0.60873, 37.02827", soc: 37, asset: null },
  { serialNo: "2ME9YBSP1C007920", imei: "867963074806432", seenMinutesAgo: 58137, location: "-1.05900, 37.13313", soc: 66, asset: S("BS0010", 3) },
  { serialNo: "2ME9YBSP1C010535", imei: "860851088728608", seenMinutesAgo: 38888, location: "-0.63611, 37.02515", soc: null, asset: V("ME92ZPSFA1J000112") },
  { serialNo: "2ME9YBSP1C005445", imei: "864714067742703", seenMinutesAgo: 23249, location: "0.04399, 37.03564", soc: 48, asset: V("ME92ZPSDB1J001111") },
  { serialNo: "2ME9YBSP1C008516", imei: "864312089098454", seenMinutesAgo: 8898, location: "-1.48321, 36.95619", soc: 25, asset: S("BS0053", 5) },
  { serialNo: "2ME9YBSP1C009585", imei: "860300080038465", seenMinutesAgo: 6283, location: "-1.23114, 36.87547", soc: null, asset: S("BS0043", 7) },
  { serialNo: "2ME9YBRP1B000380", imei: "860851088031827", seenMinutesAgo: 30249, location: "-0.43187, 36.94522", soc: null, asset: V("ME92ZPSDA2J000073") },
  { serialNo: "2ME9YBSP1C001662", imei: "860300084021103", seenMinutesAgo: 19088, location: "-1.28135, 36.80978", soc: 43, asset: V("ME92ZPSBB1J000840") },
  { serialNo: "2ME9YBSP1C008076", imei: "860300086446712", seenMinutesAgo: 157, location: "0.01367, 36.85786", soc: null, asset: null },
  { serialNo: "2ME9YBRP1B000802", imei: "864714063424825", seenMinutesAgo: 910, location: "-1.04564, 37.07066", soc: null, asset: V("ME92ZPSBC1J001033") },
  { serialNo: "2ME9YBSP1C004408", imei: "860851084535420", seenMinutesAgo: 27845, location: "-1.34174, 36.91859", soc: null, asset: V("ME92ZPSAA2J000089") },
  { serialNo: "2ME9YBSP1C010013", imei: "860851080196687", seenMinutesAgo: 9649, location: "-1.29388, 36.81129", soc: null, asset: V("ME92ZPSLA1J000164") },
  { serialNo: "2ME9YBSP1C008681", imei: "864312083070499", seenMinutesAgo: 24798, location: "", soc: null, asset: null },
  { serialNo: "2ME9YBSP1C002282", imei: "864714060259719", seenMinutesAgo: 1151, location: "-1.20747, 36.90675", soc: 29, asset: S("BS0025", 2) },
  { serialNo: "2ME9YBSP1C007248", imei: "864714063786248", seenMinutesAgo: 40633, location: "", soc: 21, asset: null },
  { serialNo: "2ME9YBRP1B000783", imei: "864312089817439", seenMinutesAgo: 4760, location: "-1.40046, 36.75577", soc: 53, asset: S("BS0054", 1) },
  { serialNo: "2ME9YBRP1B000448", imei: "867963071603169", seenMinutesAgo: 1422, location: "0.01190, 37.07454", soc: null, asset: S("BS0005", 6) },
  { serialNo: "2ME9YBSP1C009022", imei: "864714060600188", seenMinutesAgo: 17906, location: "-1.27710, 36.81630", soc: null, asset: S("BS0027", 4) },
  { serialNo: "2ME9YBSP1C001314", imei: "860851086758851", seenMinutesAgo: 5372, location: "-1.21721, 36.78373", soc: 21, asset: S("BS0037", 2) },
  { serialNo: "2ME9YBSP1C009010", imei: "860851087951151", seenMinutesAgo: 48368, location: "-1.23414, 36.90795", soc: 52, asset: S("BS0025", 8) },
  { serialNo: "2ME9YBSP1C010481", imei: "860300089847422", seenMinutesAgo: 5227, location: "-1.19490, 36.77061", soc: 72, asset: S("BS0037", 4) },
  { serialNo: "2ME9YBSP1C003322", imei: "864312087256128", seenMinutesAgo: 49834, location: "-1.50494, 37.27051", soc: null, asset: S("BS0052", 3) },
  { serialNo: "2ME9YBRP1B000456", imei: "860851080319504", seenMinutesAgo: 10045, location: "-0.43187, 36.94522", soc: null, asset: V("ME92ZPSDA2J000073") },
  { serialNo: "2ME9YBSP1C010318", imei: "864714068777654", seenMinutesAgo: 55113, location: "-1.32500, 36.86416", soc: 62, asset: V("ME92ZPSCC1J001245") },
  { serialNo: "2ME9YBSP1C003264", imei: "867963075466576", seenMinutesAgo: 64371, location: "-1.25493, 36.80864", soc: 34, asset: S("BS0027", 8) },
  { serialNo: "2ME9YBSP1C002769", imei: "864312089140931", seenMinutesAgo: 57735, location: "-1.34174, 36.91859", soc: 67, asset: V("ME92ZPSAA2J000089") },
  { serialNo: "2ME9YBRP1B000842", imei: "860851089638119", seenMinutesAgo: 58046, location: "-1.28135, 36.80978", soc: 47, asset: V("ME92ZPSBB1J000840") },
  { serialNo: "2ME9YBSP1C002825", imei: "860851081801912", seenMinutesAgo: 36132, location: "-1.20094, 36.78715", soc: null, asset: S("BS0037", 6) },
  { serialNo: "2ME9YBSP1C006371", imei: "860300085280541", seenMinutesAgo: 46790, location: "-1.21191, 36.76683", soc: 83, asset: S("BS0037", 5) },
  { serialNo: "2ME9YBSP1C003440", imei: "864312088934234", seenMinutesAgo: 43959, location: "-1.39182, 36.74701", soc: null, asset: S("BS0054", 7) },
  { serialNo: "2ME9YBSP1C002783", imei: "867963072771476", seenMinutesAgo: 56839, location: "-1.19290, 36.76914", soc: null, asset: S("BS0037", 7) },
  { serialNo: "2ME9YBSP1C010966", imei: "867963078847720", seenMinutesAgo: 155, location: "-1.32500, 36.86416", soc: 99, asset: V("ME92ZPSCC1J001245") },
  { serialNo: "2ME9YBSP1C001715", imei: "864312085574472", seenMinutesAgo: 8367, location: "-1.33258, 36.84904", soc: null, asset: S("BS0019", 8) },
  { serialNo: "2ME9YBSP1C001531", imei: "864714061988452", seenMinutesAgo: 723, location: "-1.24157, 36.88423", soc: 3, asset: S("BS0043", 1) },
  { serialNo: "2ME9YBSP1C007276", imei: "864714066751067", seenMinutesAgo: 29988, location: "-1.40557, 36.76134", soc: null, asset: S("BS0054", 3) },
  { serialNo: "2ME9YBSP1C009835", imei: "864312086768559", seenMinutesAgo: 2144, location: "-1.46124, 36.97493", soc: 61, asset: S("BS0053", 4) },
  { serialNo: "2ME9YBRP1B000567", imei: "867963070094274", seenMinutesAgo: 39010, location: "-1.09473, 37.03421", soc: null, asset: S("BS0007", 5) },
  { serialNo: "2ME9YBRP1B000856", imei: "864714069843965", seenMinutesAgo: 18312, location: "-1.50821, 37.27713", soc: 82, asset: S("BS0052", 5) },
  { serialNo: "2ME9YBSP1C008105", imei: "864714062414011", seenMinutesAgo: 8151, location: "-1.35523, 36.92343", soc: null, asset: S("BS0051", 2) },
  { serialNo: "2ME9YBSP1C007789", imei: "860300082395614", seenMinutesAgo: 46256, location: "-1.27047, 36.80654", soc: 80, asset: V("ME92ZPSFD1J002310") },
  { serialNo: "2ME9YBSP1C008728", imei: "864714061267444", seenMinutesAgo: 59655, location: "-1.51281, 37.27536", soc: null, asset: S("BS0052", 1) },
  { serialNo: "2ME9YBSP1C004884", imei: "867963073556983", seenMinutesAgo: 988, location: "-1.23900, 36.89277", soc: null, asset: S("BS0043", 2) },
  { serialNo: "2ME9YBSP1C007615", imei: "864312085114386", seenMinutesAgo: 59069, location: "0.00830, 37.08597", soc: 98, asset: V("ME92ZPSFB1J002180") },
  { serialNo: "2ME9YBRP1B000825", imei: "867963073514408", seenMinutesAgo: 4863, location: "-1.28881, 36.92165", soc: null, asset: null },
  { serialNo: "2ME9YBSP1C010270", imei: "867963072194027", seenMinutesAgo: 52481, location: "-1.39279, 36.77303", soc: 58, asset: S("BS0054", 8) },
  { serialNo: "2ME9YBSP1C004937", imei: "864714069758425", seenMinutesAgo: 4805, location: "-1.04564, 37.07066", soc: null, asset: V("ME92ZPSBC1J001033") },
  { serialNo: "2ME9YBRP1B000343", imei: "860300086247973", seenMinutesAgo: 31931, location: "-1.47161, 36.94805", soc: null, asset: S("BS0053", 7) },
  { serialNo: "2ME9YBSP1C003161", imei: "860300082748731", seenMinutesAgo: 62674, location: "-1.27047, 36.80654", soc: 49, asset: V("ME92ZPSFD1J002310") },
  { serialNo: "2ME9YBSP1C006979", imei: "860300083931585", seenMinutesAgo: 497, location: "-1.36516, 36.92279", soc: 28, asset: S("BS0051", 7) },
  { serialNo: "2ME9YBRP1B000974", imei: "860851089639063", seenMinutesAgo: 581, location: "0.00830, 37.08597", soc: 24, asset: V("ME92ZPSFB1J002180") },
  { serialNo: "2ME9YBSP1C002951", imei: "867963071367493", seenMinutesAgo: 3857, location: "-1.52544, 37.27047", soc: null, asset: S("BS0052", 2) },
  { serialNo: "2ME9YBSP1C006055", imei: "864312082382857", seenMinutesAgo: 20904, location: "-1.47358, 36.97345", soc: 49, asset: S("BS0053", 6) },
  { serialNo: "2ME9YBSP1C008292", imei: "864714069896146", seenMinutesAgo: 23056, location: "-1.04682, 37.07140", soc: null, asset: S("BS0010", 4) },
  { serialNo: "2ME9YBSP1C008415", imei: "864312080788777", seenMinutesAgo: 14524, location: "-1.36784, 36.91902", soc: null, asset: S("BS0051", 4) },
  { serialNo: "2ME9YBRP1B000646", imei: "860851089951434", seenMinutesAgo: 12264, location: "-1.23009, 36.91078", soc: 28, asset: S("BS0025", 7) },
  { serialNo: "2ME9YBSP1C001620", imei: "867963075046583", seenMinutesAgo: 16347, location: "-1.23395, 36.88580", soc: 44, asset: S("BS0025", 6) },
  { serialNo: "2ME9YBSP1C005727", imei: "864714068982872", seenMinutesAgo: 47818, location: "-1.30322, 37.07129", soc: 93, asset: null },
  { serialNo: "2ME9YBRP1B000224", imei: "860851089322271", seenMinutesAgo: 3234, location: "-1.22681, 36.89292", soc: 13, asset: S("BS0025", 3) },
  { serialNo: "2ME9YBSP1C002115", imei: "860851087988367", seenMinutesAgo: 1015, location: "-1.25529, 36.88859", soc: 79, asset: S("BS0043", 6) },
  { serialNo: "2ME9YBSP1C003849", imei: "864312083569805", seenMinutesAgo: 57828, location: "-1.38857, 36.76834", soc: 99, asset: S("BS0054", 2) },
  { serialNo: "2ME9YBSP1C010801", imei: "864312082634438", seenMinutesAgo: 448, location: "-1.53092, 37.26553", soc: null, asset: S("BS0052", 7) },
  { serialNo: "2ME9YBSP1C002930", imei: "860851088729572", seenMinutesAgo: 5521, location: "-1.33462, 36.84159", soc: 15, asset: S("BS0019", 4) },
  { serialNo: "2ME9YBSP1C008743", imei: "867963074822321", seenMinutesAgo: 4831, location: "-1.27488, 36.79763", soc: 82, asset: S("BS0027", 6) },
  { serialNo: "2ME9YBSP1C008128", imei: "864312081673489", seenMinutesAgo: 219, location: "-1.34599, 37.09075", soc: 16, asset: null },
  { serialNo: "2ME9YBSP1C007872", imei: "867963075031299", seenMinutesAgo: 6794, location: "", soc: 18, asset: null },
  { serialNo: "2ME9YBSP1C007966", imei: "867963075706642", seenMinutesAgo: 1131, location: "-1.03678, 37.08117", soc: 87, asset: S("BS0010", 5) },
  { serialNo: "2ME9YBSP1C001491", imei: "860300083823049", seenMinutesAgo: 13528, location: "-1.47618, 36.94635", soc: null, asset: S("BS0053", 3) },
  { serialNo: "2ME9YBSP1C007426", imei: "860851081630661", seenMinutesAgo: 485, location: "0.02601, 37.06280", soc: 4, asset: S("BS0003", 2) },
  { serialNo: "2ME9YBSP1C007318", imei: "867963076962717", seenMinutesAgo: 30659, location: "-1.29388, 36.81129", soc: null, asset: V("ME92ZPSLA1J000164") },
  { serialNo: "2ME9YBSP1C007303", imei: "860851080201272", seenMinutesAgo: 62735, location: "-1.25400, 36.89396", soc: 46, asset: S("BS0043", 8) },
  { serialNo: "2ME9YBSP1C001845", imei: "860851088497254", seenMinutesAgo: 34773, location: "-1.36322, 36.91939", soc: 92, asset: S("BS0051", 8) },
  { serialNo: "2ME9YBSP1C002604", imei: "864312085356166", seenMinutesAgo: 7591, location: "-1.35300, 36.92755", soc: 66, asset: S("BS0051", 6) },
  { serialNo: "2ME9YBSP1C004406", imei: "860851088047069", seenMinutesAgo: 54076, location: "0.03132, 37.05962", soc: 6, asset: S("BS0005", 5) },
  { serialNo: "2ME9YBSP1C007942", imei: "860300082238430", seenMinutesAgo: 17632, location: "-1.07233, 37.04922", soc: 51, asset: S("BS0007", 3) },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** The sample as seen at `now` (ms), with Last Seen as UTC text. */
export function batteriesAt(now: number): BatteryRecord[] {
  return ROWS.map(({ seenMinutesAgo, ...b }) => {
    const d = new Date(now - seenMinutesAgo * 60_000);
    const lastSeen =
      `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    return { ...b, lastSeen, region: regionAt(b.location) };
  });
}
