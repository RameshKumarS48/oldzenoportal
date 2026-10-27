import { stationByCode, type AssetRef } from "@/lib/mock/battery-tracking";

export { FilterChip } from "@/components/ui/FilterChip";

/**
 * The chip for a search naming one vehicle or station exactly:
 * "Station: BS0025 · Thika Rd" or "Vehicle: ME92ZPSBB1J000760".
 */
export function searchChip(asset: AssetRef): { label: string; value: string; removeLabel: string } {
  if (asset.type === "vehicle") {
    return { label: "Vehicle", value: asset.vin, removeLabel: `Remove vehicle ${asset.vin} and clear the search` };
  }
  // The street, the address's first part, places a station without its whole address.
  const street = stationByCode(asset.code)?.longAddress.split(",")[0];
  return {
    label: "Station",
    value: street ? `${asset.code} · ${street}` : asset.code,
    removeLabel: `Remove station ${asset.code} and clear the search`,
  };
}
