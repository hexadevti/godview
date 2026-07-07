// One-off backfill: add `hdi0` (Human Development Index, UNDP 2022) to every
// country in the already-generated snapshot WITHOUT re-fetching the World Bank
// data (which would refresh every other value and churn the calibration). Future
// `node scripts/ingest.mjs` runs produce hdi0 natively; this just brings the
// current snapshot up to date.
//
//   node scripts/patch-hdi.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { HDI, resolveHdi } from "./hdi-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/g20-snapshot.json");
const require = createRequire(import.meta.url);

// iso numeric (ccn3) -> iso3 (cca3), so we can key the HDI table.
const WORLD = require("world-countries");
const ISO3_BY_NUM = Object.fromEntries(WORLD.map((c) => [Number(c.ccn3), c.cca3]));

const snap = JSON.parse(readFileSync(OUT, "utf8"));
let real = 0;
let fallback = 0;
snap.countries = snap.countries.map((c) => {
  const iso3 = ISO3_BY_NUM[c.iso];
  const perCap = c.population0 ? (c.gdp0 * 1e6) / c.population0 : null; // USD
  const hdi0 = resolveHdi(iso3, c.education0, perCap);
  if (iso3 && HDI[iso3] != null) real++;
  else fallback++;
  // Re-emit with hdi0 right after education0 (matches ingest.mjs key order).
  const { education0, _g20, _gdpYear, ...rest } = c;
  return { ...rest, education0, hdi0, _g20, _gdpYear };
});

writeFileSync(OUT, JSON.stringify(snap, null, 2) + "\n");
console.log(
  `Patched hdi0 into ${snap.countries.length} countries ` +
    `(${real} from UNDP table, ${fallback} derived fallback).`,
);
