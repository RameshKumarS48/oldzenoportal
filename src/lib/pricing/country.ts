/**
 * Where a plan prices swaps. The country fixes the currency its rates are in
 * and the most a rate can be; it is chosen when the plan is created and never
 * changes. A plan saved before countries existed is in Kenya.
 */

export type CountryCode = "KE" | "UG";

export interface Country {
  code: CountryCode;
  name: string;
  currency: string;
  /** Rates are whole numbers from 1 to this, per kWh. */
  maxRate: number;
}

export const COUNTRIES: Record<CountryCode, Country> = {
  KE: { code: "KE", name: "Kenya", currency: "KES", maxRate: 500 },
  UG: { code: "UG", name: "Uganda", currency: "UGX", maxRate: 20_000 },
};

/** Kenya first: it's where the Default plan and every station are today. */
export const COUNTRY_LIST: Country[] = [COUNTRIES.KE, COUNTRIES.UG];

export const DEFAULT_COUNTRY: CountryCode = "KE";

/** A plan's (or station's) country; unset means Kenya. */
export const countryOf = (x: { country?: CountryCode }): Country => COUNTRIES[x.country ?? DEFAULT_COUNTRY];
