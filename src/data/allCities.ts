// City lookup for ANY country (not just the G20). Priority:
//   1. curated multi-city lists (cities.ts) — hand-tuned for the G20,
//   2. real top cities per country (generated/world-cities.json, GeoNames),
//   3. a single point at the country centroid, labelled with its capital.
// Keyed by ISO 3166-1 numeric (ccn3), matching the globe polygons.

import countriesData from "world-countries/countries.json";
import worldCitiesData from "./generated/world-cities.json";
import { CITIES, type City } from "./cities";

// Real top cities per country (GeoNames via scripts/ingest-cities.mjs).
const WORLD_CITIES = worldCitiesData.cities as unknown as Record<number, City[]>;

interface CountryRec {
  ccn3?: string;
  capital?: string[];
  latlng?: [number, number];
  name: { common: string };
}

// Capital-only fallback for any country missing from the datasets above.
const CAPITAL: Record<number, City[]> = {};
for (const c of countriesData as unknown as CountryRec[]) {
  if (!c.ccn3 || !c.latlng || c.latlng.length < 2) continue;
  const iso = Number(c.ccn3);
  if (!iso) continue;
  const name = c.capital && c.capital[0] ? c.capital[0] : c.name.common;
  CAPITAL[iso] = [{ name, lat: c.latlng[0], lng: c.latlng[1] }];
}

/** Cities for a country: curated list, else real top cities, else its capital. */
export function citiesFor(iso: number): City[] {
  return CITIES[iso] ?? WORLD_CITIES[iso] ?? CAPITAL[iso] ?? [];
}

/** Every country we can draw an internal city network for (≥1 city). */
export const ALL_CITY_ISOS: number[] = Array.from(
  new Set<number>([
    ...Object.keys(CITIES).map(Number),
    ...Object.keys(WORLD_CITIES).map(Number),
  ]),
);
