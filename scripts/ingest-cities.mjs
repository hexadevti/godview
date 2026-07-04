// Fase 1 (cities) — top cities per country for the WHOLE world, so every country
// (not just the G20) gets labelled city markers and an internal road/rail network.
// Source: the `all-the-cities` dataset (GeoNames, population >= 1000), grouped by
// country and reduced to the largest N by population.
//
//   node scripts/ingest-cities.mjs
//
// Output: src/data/generated/world-cities.json  ({ [ccn3]: [{name,lat,lng,pop}] })

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/world-cities.json");
const require = createRequire(import.meta.url);

const ALL_CITIES = require("all-the-cities");
const WORLD = require("world-countries");

const TOP_PER_COUNTRY = 6; // internal-network nodes / labelled markers per country
const MIN_POP = 50000; // ignore tiny places so the network reads as "major cities"

// ISO 3166-1 alpha-2 (GeoNames) -> numeric ccn3 (our globe polygons).
const A2_TO_CCN3 = {};
for (const c of WORLD) if (c.cca2 && c.ccn3) A2_TO_CCN3[c.cca2] = Number(c.ccn3);

// Group by country, keep populated places only.
const byCountry = {}; // ccn3 -> [{name,lat,lng,pop}]
for (const c of ALL_CITIES) {
  if (!c.featureCode || !c.featureCode.startsWith("PPL")) continue; // populated place
  if (!c.population || c.population < MIN_POP) continue;
  const iso = A2_TO_CCN3[c.country];
  if (!iso) continue;
  const [lng, lat] = c.loc.coordinates;
  (byCountry[iso] ||= []).push({ name: c.name, lat, lng, pop: c.population });
}

// Reduce to the top-N by population, de-duplicating repeated names (keep biggest).
const out = {};
let total = 0;
for (const [iso, list] of Object.entries(byCountry)) {
  const seen = new Map();
  for (const city of list.sort((a, b) => b.pop - a.pop)) {
    if (!seen.has(city.name)) seen.set(city.name, city);
    if (seen.size >= TOP_PER_COUNTRY) break;
  }
  const top = [...seen.values()].map((c) => ({
    name: c.name,
    lat: Math.round(c.lat * 1000) / 1000,
    lng: Math.round(c.lng * 1000) / 1000,
    pop: c.pop,
  }));
  out[iso] = top;
  total += top.length;
}

const payload = {
  asOf: new Date().toISOString().slice(0, 10),
  source: "all-the-cities (GeoNames, population >= 1000); top cities per country by population",
  topPerCountry: TOP_PER_COUNTRY,
  cities: out,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload) + "\n");
console.log(`Wrote ${total} cities across ${Object.keys(out).length} countries to ${OUT}`);
