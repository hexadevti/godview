// One-off backfill: add `costOfLiving0` (Cost of Living index, NYC=100) to every
// country in the already-generated snapshot WITHOUT re-fetching the World Bank
// data. Future `node scripts/ingest.mjs` runs produce it natively; this just
// brings the current snapshot up to date.
//
//   node scripts/patch-cost-of-living.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { COST_OF_LIVING, resolveCostOfLiving } from "./cost-of-living-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/g20-snapshot.json");
const require = createRequire(import.meta.url);

// iso numeric (ccn3) -> iso3 (cca3), so we can key the table.
const WORLD = require("world-countries");
const ISO3_BY_NUM = Object.fromEntries(WORLD.map((c) => [Number(c.ccn3), c.cca3]));

const snap = JSON.parse(readFileSync(OUT, "utf8"));
let real = 0;
let fallback = 0;
snap.countries = snap.countries.map((c) => {
  const iso3 = ISO3_BY_NUM[c.iso];
  const perCap = c.population0 ? (c.gdp0 * 1e6) / c.population0 : null; // USD
  const costOfLiving0 = resolveCostOfLiving(iso3, perCap);
  if (iso3 && COST_OF_LIVING[iso3] != null) real++;
  else fallback++;
  // Re-emit with costOfLiving0 right after hdi0 (matches ingest.mjs key order).
  const { education0, hdi0, _g20, _gdpYear, ...rest } = c;
  return { ...rest, education0, hdi0, costOfLiving0, _g20, _gdpYear };
});

writeFileSync(OUT, JSON.stringify(snap, null, 2) + "\n");
console.log(
  `Patched costOfLiving0 into ${snap.countries.length} countries ` +
    `(${real} from curated table, ${fallback} derived fallback).`,
);
