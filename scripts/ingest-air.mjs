// Fase 0/1 (air) — real WORLDWIDE air connectivity via OpenFlights. Uses the
// routes database (which airport pairs actually have flights) to draw air routes
// between really-connected airports for EVERY country, weighted by real flight
// frequency, capped per source country so the globe stays readable. Geometry is
// geodesic (planes fly great circles).
//
//   node scripts/ingest-air.mjs
//
// Output: src/data/generated/air-routes.json

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/air-routes.json");
const require = createRequire(import.meta.url);
const WORLD = require("world-countries");

const MAX_AIRPORT_PAIRS = 2; // busiest airport pairs per country pair
const MAX_PER_SOURCE = 2;    // busiest destinations kept per origin country
const MIN_COUNT = 2;         // ignore country pairs with < 2 recorded flights

// OpenFlights airport country name -> ISO 3166-1 numeric. Built from
// world-countries (common/official/altSpellings), plus OpenFlights-specific names.
const NAME_TO_ISO = {};
for (const c of WORLD) {
  const iso = Number(c.ccn3);
  if (!iso) continue;
  for (const n of [c.name.common, c.name.official, ...(c.altSpellings || [])]) {
    if (n && !(n in NAME_TO_ISO)) NAME_TO_ISO[n] = iso;
  }
}
Object.assign(NAME_TO_ISO, {
  "Congo (Kinshasa)": 180, "Congo (Brazzaville)": 178, Burma: 104,
  "Ivory Coast": 384, "Cape Verde": 132, "Czech Republic": 203,
  Macedonia: 807, "East Timor": 626, Swaziland: 748, "South Korea": 410,
  "North Korea": 408, "Hong Kong": 156, Macau: 156, // fold SARs into China
});

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === ",") { out.push(cur); cur = ""; }
    else if (ch === '"') inQ = true;
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function main() {
  console.log("Fetching OpenFlights airports + routes…");
  const [aTxt, rTxt] = await Promise.all([
    fetch("https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat").then((r) => r.text()),
    fetch("https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat").then((r) => r.text()),
  ]);

  // IATA -> { iso, lat, lng } for every mappable airport.
  const airports = {};
  for (const line of aTxt.trim().split("\n")) {
    const f = parseCsvLine(line);
    const iso = NAME_TO_ISO[f[3]];
    const iata = f[4];
    if (!iso || !iata || iata === "\\N") continue;
    const lat = +f[6], lng = +f[7];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    airports[iata] = { iso, lat, lng };
  }

  // Count flights per directed airport pair (between different countries).
  const pairCount = {}; // "SRC>DST" -> count
  for (const line of rTxt.trim().split("\n")) {
    const f = parseCsvLine(line);
    const s = airports[f[2]];
    const d = airports[f[4]];
    if (!s || !d || s.iso === d.iso) continue;
    pairCount[`${f[2]}>${f[4]}`] = (pairCount[`${f[2]}>${f[4]}`] || 0) + 1;
  }

  // Group airport pairs by directed country pair; tally total flights.
  const byCountryPair = {}; // "fromIso-toIso" -> { total, pairs:[{src,dst,count}] }
  for (const [key, count] of Object.entries(pairCount)) {
    const [src, dst] = key.split(">");
    const cpk = `${airports[src].iso}-${airports[dst].iso}`;
    const e = (byCountryPair[cpk] ||= { total: 0, pairs: [] });
    e.total += count;
    e.pairs.push({ src, dst, count });
  }

  // Keep the busiest destinations per source country, then the busiest airport
  // pairs within each — bounding the total number of animated routes.
  const bySource = {}; // fromIso -> [{ to, total, pairs }]
  for (const [cpk, e] of Object.entries(byCountryPair)) {
    if (e.total < MIN_COUNT) continue;
    const [from, to] = cpk.split("-").map(Number);
    (bySource[from] ||= []).push({ to, total: e.total, pairs: e.pairs });
  }

  const routes = [];
  for (const [fromStr, dests] of Object.entries(bySource)) {
    const from = Number(fromStr);
    const top = dests.sort((a, b) => b.total - a.total).slice(0, MAX_PER_SOURCE);
    for (const dest of top) {
      const pairs = dest.pairs.sort((a, b) => b.count - a.count).slice(0, MAX_AIRPORT_PAIRS);
      const totalCount = pairs.reduce((s, p) => s + p.count, 0);
      for (const p of pairs) {
        const a = airports[p.src], b = airports[p.dst];
        routes.push({
          from,
          to: dest.to,
          value: Math.max(1, Math.round((dest.total * p.count) / totalCount)),
          a: [Math.round(a.lat * 100) / 100, Math.round(a.lng * 100) / 100],
          b: [Math.round(b.lat * 100) / 100, Math.round(b.lng * 100) / 100],
        });
      }
    }
  }

  routes.sort((x, y) => y.value - x.value);
  const out = {
    asOf: new Date().toISOString().slice(0, 10),
    source: "OpenFlights routes.dat (real airport connectivity, worldwide); value = flight frequency",
    routes,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out) + "\n");
  const countries = new Set(routes.flatMap((r) => [r.from, r.to]));
  console.log(`Wrote ${routes.length} air routes touching ${countries.size} countries to ${OUT}`);
  console.log("Top:", routes.slice(0, 8).map((r) => `${r.from}->${r.to}:${r.value}`).join("  "));
}

main().catch((e) => { console.error("Air ingestion failed:", e.message); process.exit(1); });
