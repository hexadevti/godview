// Fase 0/1 — ingestion pipeline. Fetches real macro + social data from the World
// Bank API (free, no key) for EVERY country that has a Natural Earth polygon
// (world-atlas 110m ∩ world-countries UN members), and merges it with a curated
// policy/social table for the G20 (rates, targets, debt, Gini, etc. — not all
// published by the World Bank). Countries outside the curated set get sensible
// DERIVED defaults so the whole world is playable ("Todos os países" scope).
//
//   node scripts/ingest.mjs
//
// Output: src/data/generated/g20-snapshot.json (name kept for compatibility;
// it now holds ~165 countries, not just the G20).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/g20-snapshot.json");
const require = createRequire(import.meta.url);

// ---- Master country list: world-countries UN members that also have a polygon
//      in world-atlas 110m (so every simulated country is visible/clickable). ----
const WORLD = require("world-countries");
const worldTopo = require("world-atlas/countries-110m.json");
const { feature } = require("topojson-client");
const fc = feature(worldTopo, worldTopo.objects.countries);
const FEAT_IDS = new Set(fc.features.map((f) => Number(f.id)));
const FEAT_NAMES = new Set(fc.features.map((f) => f.properties.name));

const MASTER = WORLD.filter(
  (c) => c.unMember && (FEAT_IDS.has(Number(c.ccn3)) || FEAT_NAMES.has(c.name.common)),
).map((c) => ({
  iso: Number(c.ccn3), // ISO 3166-1 numeric = world-atlas feature id
  iso3: c.cca3,
  name: c.name.common,
  lat: c.latlng?.[0] ?? 0,
  lng: c.latlng?.[1] ?? 0,
  region: c.region || "",
}));

// ---- Curated G20 policy params (World Bank doesn't publish policy rates). ----
//        iso3, centroid, and monetary anchors.
const G20_POLICY = {
  ARG: { lat: -38.4, lng: -63.6,  rate0: 32,   neutralRate: 14,  inflTarget: 10 },
  AUS: { lat: -25.3, lng: 133.8,  rate0: 4.35, neutralRate: 3.0, inflTarget: 2.5 },
  BRA: { lat: -14.2, lng: -51.9,  rate0: 12.25, neutralRate: 5.0, inflTarget: 3.0 },
  CAN: { lat: 56.1,  lng: -106.3, rate0: 3.25, neutralRate: 2.75, inflTarget: 2.0 },
  CHN: { lat: 35.9,  lng: 104.2,  rate0: 3.1,  neutralRate: 3.0, inflTarget: 2.0 },
  FRA: { lat: 46.6,  lng: 2.2,    rate0: 3.15, neutralRate: 2.0, inflTarget: 2.0 },
  DEU: { lat: 51.2,  lng: 10.4,   rate0: 3.15, neutralRate: 2.0, inflTarget: 2.0 },
  IND: { lat: 22.4,  lng: 78.7,   rate0: 6.5,  neutralRate: 5.5, inflTarget: 4.0 },
  IDN: { lat: -2.5,  lng: 118.0,  rate0: 6.0,  neutralRate: 4.5, inflTarget: 3.0 },
  ITA: { lat: 41.9,  lng: 12.6,   rate0: 3.15, neutralRate: 2.0, inflTarget: 2.0 },
  JPN: { lat: 36.2,  lng: 138.3,  rate0: 0.25, neutralRate: 1.0, inflTarget: 2.0 },
  MEX: { lat: 23.6,  lng: -102.5, rate0: 10.0, neutralRate: 5.0, inflTarget: 3.0 },
  RUS: { lat: 61.5,  lng: 105.3,  rate0: 21,   neutralRate: 7.0, inflTarget: 4.0 },
  SAU: { lat: 23.9,  lng: 45.1,   rate0: 5.5,  neutralRate: 3.0, inflTarget: 2.0 },
  ZAF: { lat: -30.6, lng: 22.9,   rate0: 7.75, neutralRate: 4.0, inflTarget: 4.5 },
  KOR: { lat: 35.9,  lng: 127.8,  rate0: 3.0,  neutralRate: 2.5, inflTarget: 2.0 },
  TUR: { lat: 39.0,  lng: 35.2,   rate0: 45,   neutralRate: 18,  inflTarget: 5.0 },
  GBR: { lat: 55.4,  lng: -3.4,   rate0: 4.75, neutralRate: 2.5, inflTarget: 2.0 },
  USA: { lat: 39.8,  lng: -98.6,  rate0: 4.5,  neutralRate: 3.0, inflTarget: 2.0 },
};

// Curated social / fiscal / demographic anchors for the G20 (WB coverage for
// debt / Gini / poverty / tax is spotty and stale). The well-covered indicators
// (unemployment, population, pop. growth, dependency) are fetched live and
// override these. `commodityExporter` is net commodity exposure (-1 importer ..
// +1 exporter); `approval0` is a plausible starting political-capital score.
const G20_SOCIAL = {
  ARG: { nairu: 7,   debt0: 155, gini0: 42, poverty0: 42, taxBaseline: 29, approval0: 45, commodityExporter: 0.6 },
  AUS: { nairu: 4.5, debt0: 50,  gini0: 34, poverty0: 12, taxBaseline: 28, approval0: 50, commodityExporter: 0.9 },
  BRA: { nairu: 8,   debt0: 85,  gini0: 52, poverty0: 20, taxBaseline: 33, approval0: 48, commodityExporter: 0.6 },
  CAN: { nairu: 6,   debt0: 105, gini0: 33, poverty0: 10, taxBaseline: 33, approval0: 48, commodityExporter: 0.5 },
  CHN: { nairu: 5,   debt0: 83,  gini0: 38, poverty0: 15, taxBaseline: 21, approval0: 65, commodityExporter: -0.5 },
  FRA: { nairu: 7.5, debt0: 111, gini0: 32, poverty0: 14, taxBaseline: 46, approval0: 42, commodityExporter: -0.4 },
  DEU: { nairu: 4,   debt0: 64,  gini0: 32, poverty0: 15, taxBaseline: 40, approval0: 45, commodityExporter: -0.6 },
  IND: { nairu: 7,   debt0: 82,  gini0: 35, poverty0: 18, taxBaseline: 18, approval0: 60, commodityExporter: -0.5 },
  IDN: { nairu: 5,   debt0: 39,  gini0: 38, poverty0: 20, taxBaseline: 12, approval0: 62, commodityExporter: 0.4 },
  ITA: { nairu: 8.5, debt0: 137, gini0: 35, poverty0: 18, taxBaseline: 43, approval0: 43, commodityExporter: -0.5 },
  JPN: { nairu: 2.8, debt0: 250, gini0: 33, poverty0: 16, taxBaseline: 34, approval0: 45, commodityExporter: -0.7 },
  MEX: { nairu: 4,   debt0: 50,  gini0: 45, poverty0: 36, taxBaseline: 17, approval0: 55, commodityExporter: 0.2 },
  RUS: { nairu: 4.5, debt0: 20,  gini0: 36, poverty0: 12, taxBaseline: 30, approval0: 60, commodityExporter: 0.9 },
  SAU: { nairu: 5,   debt0: 27,  gini0: 45, poverty0: 12, taxBaseline: 8,  approval0: 60, commodityExporter: 1.0 },
  ZAF: { nairu: 25,  debt0: 74,  gini0: 63, poverty0: 55, taxBaseline: 28, approval0: 40, commodityExporter: 0.4 },
  KOR: { nairu: 3,   debt0: 55,  gini0: 31, poverty0: 15, taxBaseline: 28, approval0: 45, commodityExporter: -0.6 },
  TUR: { nairu: 9,   debt0: 34,  gini0: 42, poverty0: 15, taxBaseline: 23, approval0: 48, commodityExporter: -0.4 },
  GBR: { nairu: 4.5, debt0: 100, gini0: 35, poverty0: 18, taxBaseline: 35, approval0: 40, commodityExporter: -0.2 },
  USA: { nairu: 4,   debt0: 122, gini0: 40, poverty0: 12, taxBaseline: 27, approval0: 47, commodityExporter: 0.1 },
};

const IND = {
  gdp: "NY.GDP.MKTP.CD",       // GDP, current US$
  infl: "FP.CPI.TOTL.ZG",      // inflation, consumer prices (annual %)
  growth: "NY.GDP.MKTP.KD.ZG", // GDP growth (annual %)
  exports: "NE.EXP.GNFS.ZS",   // exports of goods & services (% of GDP)
  imports: "NE.IMP.GNFS.ZS",   // imports of goods & services (% of GDP)
  unemp: "SL.UEM.TOTL.ZS",     // unemployment, total (% of labor force, ILO est.)
  pop: "SP.POP.TOTL",          // population, total
  popGrowth: "SP.POP.GROW",    // population growth (annual %)
  dependency: "SP.POP.DPND",   // age dependency ratio (% of working-age pop.)
  gini: "SI.POV.GINI",         // Gini index
  debt: "GC.DOD.TOTL.GD.ZS",   // central government debt, total (% of GDP)
  tax: "GC.TAX.TOTL.GD.ZS",    // tax revenue (% of GDP)
  poverty: "SI.POV.DDAY",      // poverty headcount at $2.15/day (% of pop.)
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch one indicator for ALL economies over a date window. We drop null values,
// so `latest()` returns the most recent REAL value (mrv would return the most
// recent PERIOD even when it's empty — wrong for sparse series like Gini).
// Retries with backoff: firing every indicator in parallel can trip WB's rate
// limit with a transient 400/429/5xx.
async function fetchAll(code) {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=2010:2025`;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = json[1] || [];
      const byIso = {}; // iso3 -> { year: value }
      for (const r of rows) {
        if (r.value == null) continue;
        const iso = r.countryiso3code;
        if (!iso) continue;
        (byIso[iso] ||= {})[r.date] = r.value;
      }
      return byIso;
    } catch (e) {
      lastErr = e;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw new Error(`${code}: ${lastErr.message}`);
}

const latest = (series) => {
  if (!series) return null;
  const years = Object.keys(series).map(Number).sort((a, b) => b - a);
  return years.length ? series[years[0]] : null;
};
const latestYear = (series) => {
  if (!series) return null;
  const years = Object.keys(series).map(Number).sort((a, b) => b - a);
  return years.length ? years[0] : null;
};
const avgFrom = (series, fromYear) => {
  if (!series) return null;
  const vals = Object.entries(series).filter(([y]) => +y >= fromYear).map(([, v]) => v);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};
const round = (v, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

async function main() {
  console.log(`Fetching World Bank indicators for ${MASTER.length} countries…`);
  const [gdp, infl, growth, exp, imp, unemp, pop, popGrowth, dependency, gini, debt, tax, poverty] =
    await Promise.all([
      fetchAll(IND.gdp), fetchAll(IND.infl), fetchAll(IND.growth),
      fetchAll(IND.exports), fetchAll(IND.imports), fetchAll(IND.unemp),
      fetchAll(IND.pop), fetchAll(IND.popGrowth), fetchAll(IND.dependency),
      fetchAll(IND.gini), fetchAll(IND.debt), fetchAll(IND.tax), fetchAll(IND.poverty),
    ]);

  const countries = [];
  const skipped = [];
  for (const m of MASTER) {
    const k = m.iso3;
    const gdpUsd = latest(gdp[k]);
    if (gdpUsd == null) { skipped.push(m.name); continue; } // no economy → skip

    const pol = G20_POLICY[k]; // curated monetary anchors (G20 only)
    const soc = G20_SOCIAL[k]; // curated social anchors (G20 only)
    const isG20 = !!pol;

    const inflVal = latest(infl[k]);
    const potential = avgFrom(growth[k], 2013);
    const potentialGrowth = round(clamp(potential != null ? potential : 2, 0.3, 9), 1);

    // Monetary policy: curated for G20, derived otherwise.
    const inflTarget = pol?.inflTarget ?? 3;
    const rate0 = pol?.rate0 ?? round(clamp(Math.max(0.5, (inflVal ?? inflTarget) * 0.7 + 0.5), 0.25, 45), 2);
    const neutralRate = pol?.neutralRate ?? round(clamp(inflTarget + Math.max(0, potentialGrowth - 1) * 0.4, 1, 8), 2);

    // Social/fiscal/demographic: real WB where covered, else curated (G20), else derived.
    const unemployment0 = round(latest(unemp[k]) ?? soc?.unemployment0 ?? 6, 1);
    const nairu = soc?.nairu ?? round(clamp(Math.min(unemployment0, 10), 2, 15), 1);
    const debt0 = round(soc?.debt0 ?? latest(debt[k]) ?? 55, 0);
    const gini0 = round(soc?.gini0 ?? latest(gini[k]) ?? 38, 0);
    const poverty0 = round(soc?.poverty0 ?? latest(poverty[k]) ?? clamp((gini0 - 25) * 0.7 + 3, 2, 60), 0);
    const population0 = round(latest(pop[k]) != null ? latest(pop[k]) / 1e6 : soc?.population0 ?? 20, 1);
    const popGr = round(latest(popGrowth[k]) ?? soc?.popGrowth ?? 0.7, 2);
    const dependencyRatio = round(latest(dependency[k]) ?? soc?.dependencyRatio ?? 55, 0);
    const taxBaseline = round(soc?.taxBaseline ?? latest(tax[k]) ?? 20, 0);
    const approval0 = soc?.approval0 ?? 50;
    const commodityExporter = soc?.commodityExporter ?? 0;

    const exportShare = latest(exp[k]);
    const importShare = latest(imp[k]);

    countries.push({
      iso: m.iso,
      name: m.name,
      lat: pol?.lat ?? m.lat,
      lng: pol?.lng ?? m.lng,
      gdp0: round(gdpUsd / 1e12, 3),
      rate0,
      infl0: round(inflVal ?? 3, 1),
      potentialGrowth,
      neutralRate,
      inflTarget,
      exportShare: round(exportShare != null ? exportShare / 100 : 0.3, 3),
      importShare: round(importShare != null ? importShare / 100 : 0.3, 3),
      unemployment0,
      nairu,
      debt0,
      gini0,
      poverty0,
      population0,
      popGrowth: popGr,
      dependencyRatio,
      taxBaseline,
      approval0,
      commodityExporter,
      _g20: isG20,
      _gdpYear: latestYear(gdp[k]),
    });
  }

  countries.sort((a, b) => b.gdp0 - a.gdp0);

  const out = {
    asOf: new Date().toISOString().slice(0, 10),
    source: {
      macro: "World Bank Open Data API (api.worldbank.org)",
      indicators: IND,
      note:
        "Country list = world-countries UN members that have a world-atlas 110m polygon. " +
        "GDP/inflation/growth/trade shares, unemployment, population, pop. growth, dependency, and " +
        "(where covered) Gini/debt/tax/poverty are real World Bank data. G20 monetary anchors " +
        "(rate0/neutralRate/inflTarget) and social anchors (debt/Gini/poverty/tax/approval/commodity) " +
        "are curated; other countries get derived defaults.",
    },
    countries,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

  const g20Count = countries.filter((c) => c._g20).length;
  console.log(`\nWrote ${countries.length} countries to ${OUT}`);
  console.log(`  (${g20Count} curated G20 + ${countries.length - g20Count} derived; ${skipped.length} skipped for no GDP)`);
  if (skipped.length) console.log(`  Skipped (no WB GDP): ${skipped.join(", ")}`);
  console.log("\n  Top 10 by GDP:");
  for (const c of countries.slice(0, 10)) {
    console.log(
      `  ${c.name.padEnd(16)} PIB $${String(c.gdp0).padStart(7)}T (${c._gdpYear})  ` +
      `infl ${String(c.infl0).padStart(5)}%  desemp ${String(c.unemployment0).padStart(4)}%  ` +
      `dívida ${String(c.debt0).padStart(3)}%  gini ${c.gini0}  ${c._g20 ? "[G20]" : ""}`,
    );
  }
}

main().catch((e) => {
  console.error("Ingestion failed:", e.message);
  process.exit(1);
});
