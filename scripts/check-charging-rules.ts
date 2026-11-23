/**
 * Checks Zeno Charging's validation rules, one case per rule.
 * Run: npx tsx scripts/check-charging-rules.ts  (exits 1 on any failure)
 */
import { emptyInput, nextSiteId, type ChargingAsset, type ChargingAssetInput } from "../src/lib/charging/fields";
import { cleanInput, coordsFromText, validateAsset } from "../src/lib/charging/validate";
import { chargingCan } from "../src/lib/charging/permissions";
import { publicLocations } from "../src/lib/charging/public";

const failures: string[] = [];
const check = (name: string, ok: boolean) => { if (!ok) failures.push(name); };
const today = new Date("2026-11-23T00:00:00Z");

const good: ChargingAssetInput = {
  ...emptyInput(),
  siteId: "Site-0300", siteName: "Test Plaza, Ngong Rd, Nairobi", landmark: "Test Plaza", area: "Kilimani", road: "Ngong Rd", town: "Nairobi", country: "Kenya",
  lat: -1.3, lng: 36.78, assetId: "BS0999", assetType: "Swap Station", assetName: "Test Plaza, Ngong Rd, Nairobi - Swap Station",
  commissionStatus: "Commissioned", accessType: "Public", goLiveDate: "2026-11-01", monthlyRent: 5000, paymentFrequency: "Monthly",
  phaseType: "Single Phase", electricityServiceType: "Pre-paid", evTariffStatus: "Not active",
};
const stored = (over: Partial<ChargingAsset>): ChargingAsset => ({
  ...good, id: "other", version: 1, needsAttention: null, archivedAt: null, createdBy: "t", createdAt: "", updatedBy: "t", updatedAt: "",
  siteId: "Site-0001", siteName: "Other Site", assetId: "BS0001", assetName: "Other Site - Swap Station", lat: -1.0, lng: 37.0, ...over,
});
const errs = (input: ChargingAssetInput, others: ChargingAsset[] = [], extra = {}) => validateAsset(input, { others, today, ...extra });

// Clean input passes.
check("valid asset has no errors", Object.keys(errs(good).errors).length === 0);
// Required fields.
check("missing landmark is an error", !!errs({ ...good, landmark: "" }).errors.landmark);
check("missing rent is an error", !!errs({ ...good, monthlyRent: null }).errors.monthlyRent);
check("missing optional zone is fine", !errs({ ...good, zone: null }).errors.zone);
// Choices.
check("unknown access type is an error", !!errs({ ...good, accessType: "Secret" }).errors.accessType);
// Asset ID: unique, format, archived still counts.
check("duplicate asset ID blocked", !!errs(good, [stored({ assetId: "BS0999" })]).errors.assetId);
check("duplicate of an archived asset blocked", !!errs(good, [stored({ assetId: "BS0999", archivedAt: "2026-01-01" })]).errors.assetId);
check("asset ID is case-insensitive after cleaning", cleanInput({ ...good, assetId: " bs0999 " }).assetId === "BS0999");
check("blank asset ID becomes null", cleanInput({ ...good, assetId: "  " }).assetId === null);
check("bad swap ID format blocked", !!errs({ ...good, assetId: "SS-12" }).errors.assetId);
check("bad swap ID allowed with override", !errs({ ...good, assetId: "SS-12" }, [], { allowIdFormat: true }).errors.assetId);
check("charger UID format", !errs({ ...good, assetType: "Fast Charger", assetId: "363438369203313137360011" }).errors.assetId);
check("short charger UID blocked", !!errs({ ...good, assetType: "Fast Charger", assetId: "36343836" }).errors.assetId);
check("editing itself is not a duplicate", !validateAsset(good, { others: [stored({ id: "me", assetId: "BS0999" })], selfId: "me", today }).errors.assetId);
// Names and sites.
check("duplicate asset name blocked", !!errs(good, [stored({ assetName: good.assetName.toUpperCase() })]).errors.assetName);
check("new site with an existing site's name blocked", !!errs(good, [stored({ siteName: good.siteName })]).errors.siteName);
check("same site name at the same site is fine", !errs(good, [stored({ siteId: "Site-0300", siteName: good.siteName })]).errors.siteName);
check("bad site ID format blocked", !!errs({ ...good, siteId: "S1" }).errors.siteId);
check("next site ID", nextSiteId(["Site-0001", "Site-0203"]) === "Site-0204");
// Location.
check("swapped lat/lng detected", /swapped/.test(errs({ ...good, lat: 36.78, lng: -1.3 }).errors.lat ?? ""));
check("point outside the country blocked", !!errs({ ...good, lat: 0.3, lng: 32.5 }).errors.lat);
check("Uganda point ok in Uganda", !errs({ ...good, country: "Uganda", lat: 0.3, lng: 32.5 }).errors.lat);
check("same type within 25 m at another site warns", errs(good, [stored({ lat: -1.30005, lng: 36.78005 })]).warnings.length === 1);
check("same site within 25 m doesn't warn", errs(good, [stored({ siteId: "Site-0300", lat: -1.3, lng: 36.78 })]).warnings.length === 0);
check("other type within 25 m doesn't warn", errs(good, [stored({ assetType: "Fast Charger", lat: -1.3, lng: 36.78 })]).warnings.length === 0);
check("google maps link parsed", JSON.stringify(coordsFromText("https://www.google.com/maps?q=-1.264197216,36.805390653")) === JSON.stringify({ lat: -1.264197216, lng: 36.805390653 }));
check("google maps @ link parsed", coordsFromText("https://www.google.com/maps/place/x/@-1.29,36.82,17z")?.lat === -1.29);
// Dates.
check("lease expiry before signing blocked", !!errs({ ...good, leaseSigned: "2026-05-01", leaseExpiry: "2026-04-01" }).errors.leaseExpiry);
check("invalid date blocked", !!errs({ ...good, goLiveDate: "2026-02-30" }).errors.goLiveDate);
check("go-live over a year ahead blocked", !!errs({ ...good, goLiveDate: "2028-01-01" }).errors.goLiveDate);
// Formats.
check("negative rent blocked", !!errs({ ...good, monthlyRent: -1 }).errors.monthlyRent);
check("phone normalised from 07…", cleanInput({ ...good, partnerContact: "0712 345 678" }).partnerContact === "254712345678");
check("two phones accepted", !errs(cleanInput({ ...good, partnerContact: "254713405319/254710255712" })).errors.partnerContact);
check("short Kenyan phone blocked", !!errs(cleanInput({ ...good, partnerContact: "254 725 86627" })).errors.partnerContact);
check("lease link must be a URL", !!errs({ ...good, leaseLink: "jira page" }).errors.leaseLink);
check("paybill digits only", !!errs({ ...good, paybill: "88-88" }).errors.paybill);
// Permissions.
check("super admin can restore", chargingCan("zeno_super_admin", "restore"));
check("internal user can write, not restore", chargingCan("zeno_admin", "write") && !chargingCan("zeno_admin", "restore"));
check("internal viewer views only", chargingCan("zeno_support", "view") && !chargingCan("zeno_support", "write"));
check("partners have no access", !chargingCan("partner_super_admin", "view") && !chargingCan("partner_user", "view"));
check("unknown role has no access", !chargingCan(null, "view"));
// Public feed.
const feed = publicLocations([
  stored({ id: "a" }),
  stored({ id: "b", commissionStatus: "Decommissioned" }),
  stored({ id: "c", accessType: "Restricted" }),
  stored({ id: "d", archivedAt: "2026-01-01" }),
]);
check("public feed only has commissioned, public, unarchived", feed.length === 1 && feed[0].id === "a");
check("public feed has no rent, lease or partner data", !Object.keys(feed[0]).some((k) => /rent|lease|partner|meter|paybill|account|payment/i.test(k)));

if (failures.length) {
  console.error(`${failures.length} failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("All Zeno Charging rule checks passed.");
