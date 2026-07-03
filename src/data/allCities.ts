// City lookup for ANY country (not just G20). Curated multi-city lists from
// cities.ts take priority; every other country falls back to a single point at
// its centroid, labelled with its capital (from the offline `world-countries`
// dataset). Keyed by ISO 3166-1 numeric (ccn3), matching the globe polygons.

import countriesData from "world-countries/countries.json";
import { CITIES, type City } from "./cities";

interface CountryRec {
  ccn3?: string;
  capital?: string[];
  latlng?: [number, number];
  name: { common: string };
}

const ALL: Record<number, City[]> = {};
for (const c of countriesData as unknown as CountryRec[]) {
  if (!c.ccn3 || !c.latlng || c.latlng.length < 2) continue;
  const iso = Number(c.ccn3);
  if (!iso) continue;
  const name = c.capital && c.capital[0] ? c.capital[0] : c.name.common;
  ALL[iso] = [{ name, lat: c.latlng[0], lng: c.latlng[1] }];
}

/** Cities for a country: curated list if we have one, else its capital point. */
export function citiesFor(iso: number): City[] {
  return CITIES[iso] ?? ALL[iso] ?? [];
}
