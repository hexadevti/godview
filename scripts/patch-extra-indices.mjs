// One-off backfill: add the seven governance/wellbeing indices (econFreedom0,
// cpi0, democracy0, pressFreedom0, spi0, happiness0, homicide0) to every country
// in the already-generated snapshot WITHOUT re-fetching World Bank data. Future
// `node scripts/ingest.mjs` runs produce them natively. Depends on hdi0 being
// present (for the fallbacks).
//
//   node scripts/patch-extra-indices.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { resolveExtraIndices, EXTRA_INDEX_TABLES } from "./extra-indices-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/g20-snapshot.json");
const require = createRequire(import.meta.url);

const WORLD = require("world-countries");
const ISO3_BY_NUM = Object.fromEntries(WORLD.map((c) => [Number(c.ccn3), c.cca3]));

const snap = JSON.parse(readFileSync(OUT, "utf8"));
const counts = Object.fromEntries(Object.keys(EXTRA_INDEX_TABLES).map((k) => [k, 0]));
snap.countries = snap.countries.map((c) => {
  const iso3 = ISO3_BY_NUM[c.iso];
  const extra = resolveExtraIndices(iso3, c.hdi0);
  for (const key of Object.keys(EXTRA_INDEX_TABLES)) {
    if (iso3 && EXTRA_INDEX_TABLES[key][iso3] != null) counts[key]++;
  }
  // Re-emit with the six indices right after gci0 (matches ingest.mjs key order).
  const { gci0, _g20, _gdpYear, ...rest } = c;
  return { ...rest, gci0, ...extra, _g20, _gdpYear };
});

writeFileSync(OUT, JSON.stringify(snap, null, 2) + "\n");
const n = snap.countries.length;
const nIdx = Object.keys(EXTRA_INDEX_TABLES).length;
console.log(`Patched ${nIdx} indices into ${n} countries. Curated coverage (rest = HDI fallback):`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(13)} ${v}/${n}`);
