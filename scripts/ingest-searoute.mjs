// Fase 0/1 (sea) — real WORLDWIDE maritime routes via searoute-js. Connects a
// curated set of major world ports: each port to its nearest neighbours
// (regional lanes) plus a curated set of intercontinental trunk lanes. Every
// route is a REAL sea path (through canals/straits, avoiding land).
//
//   node scripts/ingest-searoute.mjs
//
// Output: src/data/generated/sea-routes.json

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import searouteMod from "searoute-js";

const searoute = searouteMod.default || searouteMod;
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/sea-routes.json");

// Major world ports (id, ISO 3166-1 numeric of a SIMULATED country, lat, lng).
// Entrepôts in non-simulated micro-states (Singapore, Hong Kong, UAE) are left
// out because their lanes could never be shown (their country isn't in scope).
const PORTS = [
  // East Asia
  { id: "SHA", iso: 156, lat: 31.23, lng: 121.47 }, { id: "SZX", iso: 156, lat: 22.54, lng: 114.06 },
  { id: "NGB", iso: 156, lat: 29.87, lng: 121.55 }, { id: "TAO", iso: 156, lat: 36.07, lng: 120.38 },
  { id: "PUS", iso: 410, lat: 35.10, lng: 129.04 }, { id: "YOK", iso: 392, lat: 35.45, lng: 139.66 },
  { id: "UKB", iso: 392, lat: 34.68, lng: 135.18 },
  // South & SE Asia
  { id: "NSA", iso: 356, lat: 18.95, lng: 72.95 }, { id: "MAA", iso: 356, lat: 13.08, lng: 80.27 },
  { id: "CCU", iso: 356, lat: 22.55, lng: 88.31 }, { id: "PKL", iso: 458, lat: 3.00, lng: 101.39 },
  { id: "TPP", iso: 458, lat: 1.36, lng: 103.55 }, { id: "JKT", iso: 360, lat: -6.10, lng: 106.88 },
  { id: "LCH", iso: 764, lat: 13.08, lng: 100.88 }, { id: "SGN", iso: 704, lat: 10.76, lng: 106.79 },
  { id: "HPH", iso: 704, lat: 20.86, lng: 106.68 }, { id: "MNL", iso: 608, lat: 14.60, lng: 120.97 },
  { id: "CMB", iso: 144, lat: 6.94, lng: 79.84 }, { id: "KHI", iso: 586, lat: 24.82, lng: 66.98 },
  { id: "CGP", iso: 50, lat: 22.31, lng: 91.80 },
  // Middle East
  { id: "JED", iso: 682, lat: 21.48, lng: 39.18 }, { id: "DMM", iso: 682, lat: 26.90, lng: 50.10 },
  // Europe
  { id: "RTM", iso: 528, lat: 51.95, lng: 4.14 }, { id: "ANR", iso: 56, lat: 51.26, lng: 4.40 },
  { id: "HAM", iso: 276, lat: 53.54, lng: 9.97 }, { id: "LEH", iso: 250, lat: 49.48, lng: 0.12 },
  { id: "MRS", iso: 250, lat: 43.34, lng: 5.36 }, { id: "PIR", iso: 300, lat: 37.94, lng: 23.64 },
  { id: "VLC", iso: 724, lat: 39.44, lng: -0.32 }, { id: "ALG", iso: 724, lat: 36.13, lng: -5.44 },
  { id: "GOA", iso: 380, lat: 44.41, lng: 8.93 }, { id: "GIT", iso: 380, lat: 38.43, lng: 15.90 },
  { id: "FXT", iso: 826, lat: 51.95, lng: 1.32 }, { id: "GDN", iso: 616, lat: 54.40, lng: 18.67 },
  { id: "LED", iso: 643, lat: 59.90, lng: 30.26 }, { id: "NVR", iso: 643, lat: 44.72, lng: 37.79 },
  { id: "IST", iso: 792, lat: 40.96, lng: 28.68 }, { id: "CND", iso: 642, lat: 44.17, lng: 28.65 },
  // Africa
  { id: "DUR", iso: 710, lat: -29.87, lng: 31.03 }, { id: "CPT", iso: 710, lat: -33.90, lng: 18.43 },
  { id: "LOS", iso: 566, lat: 6.44, lng: 3.37 }, { id: "PSD", iso: 818, lat: 31.25, lng: 32.30 },
  { id: "ALY", iso: 818, lat: 31.20, lng: 29.92 }, { id: "MBA", iso: 404, lat: -4.04, lng: 39.67 },
  { id: "TNG", iso: 504, lat: 35.88, lng: -5.51 }, { id: "DAR", iso: 834, lat: -6.82, lng: 39.29 },
  { id: "ABJ", iso: 384, lat: 5.28, lng: -4.00 },
  // Americas
  { id: "LAX", iso: 840, lat: 33.74, lng: -118.26 }, { id: "NYC", iso: 840, lat: 40.50, lng: -73.95 },
  { id: "SAV", iso: 840, lat: 32.08, lng: -80.90 }, { id: "HOU", iso: 840, lat: 29.30, lng: -94.80 },
  { id: "YVR", iso: 124, lat: 49.29, lng: -123.30 }, { id: "HFX", iso: 124, lat: 44.65, lng: -63.57 },
  { id: "ZLO", iso: 484, lat: 19.05, lng: -104.42 }, { id: "VER", iso: 484, lat: 19.20, lng: -96.10 },
  { id: "SSZ", iso: 76, lat: -24.00, lng: -46.35 }, { id: "PNG", iso: 76, lat: -25.55, lng: -48.55 },
  { id: "BUE", iso: 32, lat: -34.60, lng: -58.37 }, { id: "VAP", iso: 152, lat: -33.04, lng: -71.65 },
  { id: "CLL", iso: 604, lat: -12.07, lng: -77.17 }, { id: "CTG", iso: 170, lat: 10.40, lng: -75.55 },
  { id: "GYE", iso: 218, lat: -2.28, lng: -80.00 }, { id: "ONX", iso: 591, lat: 9.37, lng: -79.92 },
  // Oceania
  { id: "SYD", iso: 36, lat: -33.98, lng: 151.23 }, { id: "MEL", iso: 36, lat: -38.10, lng: 144.60 },
  { id: "FRE", iso: 36, lat: -32.05, lng: 115.74 }, { id: "AKL", iso: 554, lat: -36.84, lng: 174.80 },
];

// Curated intercontinental trunk lanes (nearest-neighbour misses ocean crossings).
const LONG_LANES = [
  ["SHA", "LAX"], ["NGB", "LAX"], ["YOK", "LAX"], ["PUS", "LAX"], ["SHA", "SYD"],
  ["RTM", "NYC"], ["ANR", "NYC"], ["FXT", "NYC"], ["RTM", "SSZ"], ["ALG", "SSZ"],
  ["SHA", "RTM"], ["SZX", "RTM"], ["CMB", "RTM"], ["JED", "RTM"], ["NSA", "JED"],
  ["DUR", "SSZ"], ["DUR", "RTM"], ["LAX", "SYD"], ["LAX", "AKL"], ["HOU", "RTM"],
  ["SAV", "RTM"], ["CTG", "RTM"], ["LOS", "RTM"], ["ABJ", "SSZ"], ["MBA", "NSA"],
  ["CPT", "SSZ"], ["VAP", "SHA"], ["CLL", "SHA"], ["GYE", "LAX"], ["ONX", "LAX"],
];

const K_NEAREST = 2; // regional lanes: each port to its 2 nearest neighbours
const MAX_LEN_KM = 24000; // drop pathological (mis-snapped) routes

const byId = Object.fromEntries(PORTS.map((p) => [p.id, p]));
const haversine = (a, b) => {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const pt = (p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] } });

function main() {
  // Build the set of unordered port pairs: nearest-neighbour + curated trunks.
  const pairs = new Set();
  const addPair = (a, b) => { if (a !== b) pairs.add([a, b].sort().join("|")); };

  for (const p of PORTS) {
    const near = PORTS.filter((q) => q.id !== p.id)
      .sort((x, y) => haversine(p, x) - haversine(p, y))
      .slice(0, K_NEAREST);
    for (const q of near) addPair(p.id, q.id);
  }
  for (const [a, b] of LONG_LANES) if (byId[a] && byId[b]) addPair(a, b);

  const routes = [];
  let dropped = 0;
  for (const key of pairs) {
    const [aId, bId] = key.split("|");
    const a = byId[aId], b = byId[bId];
    const isTrunk = LONG_LANES.some(([x, y]) => (x === aId && y === bId) || (x === bId && y === aId));
    try {
      const r = searoute(pt(a), pt(b));
      const len = r?.properties?.length ?? Infinity;
      if (!r || len > MAX_LEN_KM || r.geometry.coordinates.length < 2) { dropped++; continue; }
      const waypoints = r.geometry.coordinates.map(([lng, lat]) => [Math.round(lat * 100) / 100, Math.round(lng * 100) / 100]);
      routes.push({ from: a.iso, to: b.iso, value: isTrunk ? 110 : 70, waypoints });
    } catch {
      dropped++;
    }
  }

  routes.sort((a, b) => b.value - a.value);
  const out = {
    asOf: new Date().toISOString().slice(0, 10),
    source: "searoute-js (real marine network) between major world ports; nearest-neighbour + curated trunk lanes",
    routes,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  const countries = new Set(routes.flatMap((r) => [r.from, r.to]));
  console.log(`Wrote ${routes.length} sea routes (dropped ${dropped}) touching ${countries.size} countries to ${OUT}`);
}

main();
