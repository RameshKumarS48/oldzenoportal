/**
 * Battery Tracking: a fixed sample of the batteries the dev portal lists.
 *
 * Only the five fields that page shows. Last Seen is stored as minutes before
 * the page loads, so the "Not seen in…" presets always split the rows the same
 * way: 10 seen in the last 24 h, 13 in 1–7 days, 14 in 7–30 days and 13 in
 * 30–45 days. `batteriesAt` turns it into the text the dev portal shows, in UTC
 * ("15 Oct 2026 09:56"). `location` is "lat, long"; `soc` is null where the
 * battery hasn't reported one. The first eight rows are the dev portal's own
 * (its freshest); the rest follow their format.
 */

export interface BatteryRecord {
  serialNo: string;
  imei: string;
  /** UTC, "15 Oct 2026 09:56". */
  lastSeen: string;
  location: string;
  soc: number | null;
}

type MockRow = Omit<BatteryRecord, "lastSeen"> & { seenMinutesAgo: number };

const ROWS: MockRow[] = [
  { serialNo: "2ME9YBSP1C002378", imei: "864312084644982", seenMinutesAgo: 48, location: "-1.33069, 36.85595", soc: null },
  { serialNo: "2ME9YBSP1C010509", imei: "860300085097171", seenMinutesAgo: 677, location: "-0.43361, 36.96979", soc: null },
  { serialNo: "2ME9YBRP1B000417", imei: "867963074717373", seenMinutesAgo: 654, location: "0.02528, 37.05131", soc: null },
  { serialNo: "2ME9YBSP1C008434", imei: "860851088591800", seenMinutesAgo: 797, location: "-1.31819, 36.89030", soc: null },
  { serialNo: "2ME9YBSP1C010602", imei: "860300085096827", seenMinutesAgo: 1091, location: "0.01530, 37.07411", soc: null },
  { serialNo: "2ME9YBRP1B000849", imei: "864714067521733", seenMinutesAgo: 1358, location: "-1.28540, 36.77047", soc: null },
  { serialNo: "2ME9YBSP1C001347", imei: "864312084831878", seenMinutesAgo: 1104, location: "-0.43450, 36.94620", soc: null },
  { serialNo: "2ME9YBRP1B000824", imei: "867963074858557", seenMinutesAgo: 1299, location: "-0.58154, 37.05830", soc: null },
  { serialNo: "2ME9YBSP1C010198", imei: "860300085610477", seenMinutesAgo: 26774, location: "-0.36867, 36.97590", soc: 78 },
  { serialNo: "2ME9YBSP1C005999", imei: "864312084034479", seenMinutesAgo: 14033, location: "-0.43042, 36.97402", soc: 31 },
  { serialNo: "2ME9YBSP1C001182", imei: "867963074216217", seenMinutesAgo: 42398, location: "-0.02383, 37.06686", soc: null },
  { serialNo: "2ME9YBSP1C009341", imei: "860851088279791", seenMinutesAgo: 7592, location: "-1.08764, 37.07026", soc: 100 },
  { serialNo: "2ME9YBSP1C001215", imei: "860851088632480", seenMinutesAgo: 4905, location: "-0.57323, 37.10205", soc: 48 },
  { serialNo: "2ME9YBSP1C006789", imei: "867963074683766", seenMinutesAgo: 54742, location: "-0.99236, 37.03123", soc: null },
  { serialNo: "2ME9YBRP1B000121", imei: "860300085591282", seenMinutesAgo: 20330, location: "-0.02603, 37.01984", soc: 94 },
  { serialNo: "2ME9YBSP1C005823", imei: "864714067123536", seenMinutesAgo: 63754, location: "0.06502, 37.08262", soc: 61 },
  { serialNo: "2ME9YBSP1C008693", imei: "864312084255628", seenMinutesAgo: 1746, location: "0.05993, 37.04559", soc: null },
  { serialNo: "2ME9YBRP1B000178", imei: "860300085148927", seenMinutesAgo: 5560, location: "-0.37726, 36.95371", soc: null },
  { serialNo: "2ME9YBRP1B000136", imei: "860300085823026", seenMinutesAgo: 59612, location: "0.00282, 37.01688", soc: 72 },
  { serialNo: "2ME9YBSP1C003866", imei: "864714067701977", seenMinutesAgo: 8417, location: "-0.63794, 37.03724", soc: null },
  { serialNo: "2ME9YBSP1C001880", imei: "864714067035050", seenMinutesAgo: 29363, location: "-0.52198, 37.02082", soc: null },
  { serialNo: "2ME9YBSP1C007189", imei: "864312084211598", seenMinutesAgo: 50108, location: "0.03820, 37.03363", soc: null },
  { serialNo: "2ME9YBRP1B000788", imei: "864714067128465", seenMinutesAgo: 56812, location: "-0.47357, 36.95428", soc: 12 },
  { serialNo: "2ME9YBSP1C003779", imei: "864714067696936", seenMinutesAgo: 55850, location: "-0.60342, 36.99739", soc: 24 },
  { serialNo: "2ME9YBSP1C006062", imei: "864714067162669", seenMinutesAgo: 7696, location: "-0.41106, 36.94725", soc: null },
  { serialNo: "2ME9YBSP1C010315", imei: "867963074369585", seenMinutesAgo: 3820, location: "-1.05883, 37.11249", soc: 89 },
  { serialNo: "2ME9YBSP1C006247", imei: "860851088964091", seenMinutesAgo: 39959, location: "0.03017, 37.12085", soc: null },
  { serialNo: "2ME9YBSP1C004887", imei: "860300085889547", seenMinutesAgo: 2885, location: "-1.09834, 37.04852", soc: null },
  { serialNo: "2ME9YBSP1C003945", imei: "867963074145059", seenMinutesAgo: 61584, location: "-0.47464, 36.93850", soc: null },
  { serialNo: "2ME9YBSP1C006883", imei: "864714067603643", seenMinutesAgo: 7768, location: "-0.62036, 37.06036", soc: null },
  { serialNo: "2ME9YBSP1C008555", imei: "860851088115140", seenMinutesAgo: 45256, location: "-0.44385, 36.91514", soc: null },
  { serialNo: "2ME9YBSP1C002362", imei: "864714067064932", seenMinutesAgo: 60110, location: "-0.56582, 37.09590", soc: null },
  { serialNo: "2ME9YBSP1C009437", imei: "864714067217036", seenMinutesAgo: 12010, location: "-1.34812, 36.83718", soc: 19 },
  { serialNo: "2ME9YBSP1C004054", imei: "864312084519662", seenMinutesAgo: 29014, location: "-0.41670, 36.99019", soc: null },
  { serialNo: "2ME9YBSP1C009921", imei: "864714067646916", seenMinutesAgo: 53658, location: "-0.37718, 37.00321", soc: null },
  { serialNo: "2ME9YBRP1B000259", imei: "860851088515513", seenMinutesAgo: 53088, location: "-0.39151, 36.92477", soc: 55 },
  { serialNo: "2ME9YBRP1B000255", imei: "860851088850115", seenMinutesAgo: 21129, location: "0.04924, 37.02936", soc: 0 },
  { serialNo: "2ME9YBSP1C006171", imei: "864312084630180", seenMinutesAgo: 4466, location: "-1.29456, 36.82605", soc: 8 },
  { serialNo: "2ME9YBSP1C001377", imei: "860851088266424", seenMinutesAgo: 1634, location: "-1.05608, 37.05015", soc: null },
  { serialNo: "2ME9YBSP1C003036", imei: "860851088762738", seenMinutesAgo: 1279, location: "-1.32598, 36.82538", soc: 42 },
  { serialNo: "2ME9YBSP1C007676", imei: "864312084937349", seenMinutesAgo: 52389, location: "-1.04697, 37.02734", soc: null },
  { serialNo: "2ME9YBSP1C008869", imei: "864312084573377", seenMinutesAgo: 2285, location: "-0.62868, 37.01554", soc: null },
  { serialNo: "2ME9YBSP1C008299", imei: "864312084220195", seenMinutesAgo: 826, location: "-0.38264, 36.97351", soc: 97 },
  { serialNo: "2ME9YBSP1C009403", imei: "860300085521634", seenMinutesAgo: 16843, location: "-1.07936, 37.04312", soc: 3 },
  { serialNo: "2ME9YBRP1B000430", imei: "864714067259643", seenMinutesAgo: 10303, location: "-1.32382, 36.87362", soc: 83 },
  { serialNo: "2ME9YBSP1C002049", imei: "860300085804514", seenMinutesAgo: 7405, location: "-0.62109, 37.10941", soc: null },
  { serialNo: "2ME9YBRP1B000413", imei: "864312084282923", seenMinutesAgo: 28352, location: "-0.60873, 37.02827", soc: 37 },
  { serialNo: "2ME9YBSP1C007920", imei: "867963074806432", seenMinutesAgo: 58137, location: "-1.05900, 37.13313", soc: 66 },
  { serialNo: "2ME9YBSP1C010535", imei: "860851088728608", seenMinutesAgo: 38888, location: "-0.63611, 37.02515", soc: null },
  { serialNo: "2ME9YBSP1C005445", imei: "864714067742703", seenMinutesAgo: 23249, location: "0.04399, 37.03564", soc: 48 },
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
    return { ...b, lastSeen };
  });
}
