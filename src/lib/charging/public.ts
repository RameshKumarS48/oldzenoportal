/**
 * What the outside world sees of Zeno Charging: the rider app, zeno.earth and
 * Google. Only commissioned, public, unarchived assets, and only where-and-
 * what fields; never lease, rent, payment, meter or partner details.
 */
import { isPublic, mapsUrl, type ChargingAsset } from "./fields";

export interface PublicLocation {
  id: string;
  assetId: string | null;
  type: string;
  name: string;
  landmark: string;
  area: string;
  road: string;
  town: string;
  country: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  operationalHours: string | null;
  goLiveDate: string | null;
  updatedAt: string;
}

export function publicLocations(assets: ChargingAsset[]): PublicLocation[] {
  return assets
    .filter((a) => isPublic(a) && a.lat != null && a.lng != null)
    .map((a) => ({
      id: a.id,
      assetId: a.assetId,
      type: a.assetType,
      name: `${a.landmark} ${a.assetType}`,
      landmark: a.landmark,
      area: a.area,
      road: a.road,
      town: a.town,
      country: a.country,
      lat: a.lat!,
      lng: a.lng!,
      mapsUrl: mapsUrl(a.lat, a.lng)!,
      operationalHours: a.operationalHours,
      goLiveDate: a.goLiveDate,
      updatedAt: a.updatedAt,
    }))
    .sort((a, b) => a.town.localeCompare(b.town) || a.name.localeCompare(b.name));
}

export function addressLine(l: Pick<PublicLocation, "road" | "area" | "town" | "country">): string {
  return [l.road, l.area !== l.town ? l.area : null, l.town, l.country].filter(Boolean).join(", ");
}

/** schema.org description of one location, for Google. */
export function locationJsonLd(l: PublicLocation, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    // schema.org has no EV-charging type; AutomotiveBusiness is the closest LocalBusiness subtype.
    "@type": "AutomotiveBusiness",
    "@id": `${siteUrl}/locations#${l.id}`,
    name: `Zeno ${l.type} – ${l.landmark}`,
    description: l.type === "Fast Charger" ? "Zeno electric motorcycle fast charger." : "Zeno battery swap station for electric motorcycles.",
    brand: { "@type": "Brand", name: "Zeno" },
    address: { "@type": "PostalAddress", streetAddress: l.road, addressLocality: l.town, addressRegion: l.area, addressCountry: l.country === "Kenya" ? "KE" : l.country === "Uganda" ? "UG" : l.country === "India" ? "IN" : l.country },
    geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
    hasMap: l.mapsUrl,
    ...(l.operationalHours ? { openingHours: l.operationalHours } : {}),
  };
}

/**
 * Google Business Profile bulk upload, in the layout of the existing
 * "Zeno Charging Database" upload sheet: one row per location.
 */
export function gbpRows(locations: PublicLocation[]): (string | number)[][] {
  const head = ["Store code", "Business name", "Address line 1", "Locality", "Administrative area", "Country / Region", "Latitude", "Longitude", "Primary category", "Labels"];
  return [head, ...locations.map((l) => [
    l.assetId ?? l.id,
    `Zeno ${l.type} - ${l.landmark}`,
    l.road,
    l.town,
    l.area,
    l.country,
    l.lat,
    l.lng,
    "Electric vehicle charging station",
    l.type === "Fast Charger" ? "FC" : "SS",
  ])];
}
