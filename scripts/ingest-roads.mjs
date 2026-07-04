// Fase 0 (roads) — real road geometry via OSRM. For each curated ROAD corridor
// (landCorridors.ts, a sequence of cities), routes the multi-waypoint driving
// path through the real road network (public OSRM demo server, no key) and
// stores a downsampled polyline. rail corridors are left as great circles
// (no free rail router); routes.ts falls back to great circles for anything
// missing here.
//
//   node --experimental-strip-types scripts/ingest-roads.mjs
//
// Output: src/data/generated/road-routes.json  ({ "iso:CityA>CityB": [[lat,lng]] })

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES } from "../src/data/cities.ts";
import { CORRIDORS } from "../src/data/landCorridors.ts";
import { autoEdges, edgeKey } from "../src/data/internalNet.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/road-routes.json");
const WORLD_CITIES = resolve(__dirname, "../src/data/generated/world-cities.json");
const MAX_PTS = 90; // downsample cap per corridor

// Additional large countries (NOT hand-curated in landCorridors.ts) that get REAL
// road geometry for their auto-generated city network. The app's buildAuto picks
// the same edges (shared internalNet.autoEdges) so the keys line up.
const TARGET_ISOS = [
  250, 380, 410, 360, 792, 682, 710, 32, // G20 without a curated corridor
  724, 616, 804, 566, 818, 704, 764, 608, 458, 170, 586, 364, 504, 398, 862, 12, // large non-G20
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decimate(coords, max) {
  if (coords.length <= max) return coords;
  const out = [];
  const step = (coords.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(coords[Math.round(i * step)]);
  return out;
}

async function osrmRoute(coords) {
  // coords: [[lat,lng]...] -> OSRM wants "lng,lat;lng,lat"
  const path = coords.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=simplified&geometries=geojson`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.code !== "Ok" || !d.routes?.[0]) return null;
      return d.routes[0].geometry.coordinates; // [[lng,lat]...]
    } catch (e) {
      if (attempt === 2) return null;
      await sleep(2000);
    }
  }
  return null;
}

async function main() {
  const out = {};
  let ok = 0;
  let failed = 0;
  for (const [isoStr, corr] of Object.entries(CORRIDORS)) {
    const iso = Number(isoStr);
    const byName = new Map((CITIES[iso] || []).map((c) => [c.name, c]));
    // Road AND rail corridors both get real driving geometry (rail approximated
    // by the road path). Dedupe identical sequences so we route each key once.
    for (const names of [...corr.road, ...corr.rail]) {
      const key = `${iso}:${names.join(">")}`;
      if (out[key]) continue;
      const cities = names.map((n) => byName.get(n)).filter(Boolean);
      if (cities.length < 2) continue;
      const geom = await osrmRoute(cities.map((c) => [c.lat, c.lng]));
      if (geom && geom.length >= 2) {
        out[key] = decimate(geom, MAX_PTS).map(([lng, lat]) => [
          Math.round(lat * 1000) / 1000,
          Math.round(lng * 1000) / 1000,
        ]);
        ok++;
        console.log(`  ok  ${key.padEnd(48)} ${out[key].length} pts`);
      } else {
        failed++;
        console.log(`  --  ${key.padEnd(48)} (unroutable -> great circle)`);
      }
      await sleep(1200);
    }
  }

  // Additional countries: real geometry for their AUTO city network (same edges
  // the app's buildAuto uses, so keys match). Cities come from the curated G20
  // list if present, else the generated world-cities dataset.
  const worldCities = JSON.parse(readFileSync(WORLD_CITIES, "utf8")).cities;
  for (const iso of TARGET_ISOS) {
    const cities = CITIES[iso] ?? worldCities[iso] ?? [];
    if (cities.length < 2) continue;
    const { road, rail } = autoEdges(cities);
    const pairSeen = new Set();
    for (const [i, j] of [...road, ...rail]) {
      const undirected = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (pairSeen.has(undirected)) continue;
      pairSeen.add(undirected);
      const key = edgeKey(iso, cities[i], cities[j]);
      if (out[key]) continue;
      const geom = await osrmRoute([[cities[i].lat, cities[i].lng], [cities[j].lat, cities[j].lng]]);
      if (geom && geom.length >= 2) {
        out[key] = decimate(geom, MAX_PTS).map(([lng, lat]) => [
          Math.round(lat * 1000) / 1000,
          Math.round(lng * 1000) / 1000,
        ]);
        ok++;
        console.log(`  ok  ${key.padEnd(48)} ${out[key].length} pts`);
      } else {
        failed++;
        console.log(`  --  ${key.padEnd(48)} (unroutable -> great circle)`);
      }
      await sleep(1200);
    }
  }

  const payload = {
    asOf: new Date().toISOString().slice(0, 10),
    source: "OSRM public demo server — real driving routes (road; rail approximated by road path)",
    routes: out,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload) + "\n");
  console.log(`\nWrote ${ok} real road routes (${failed} fell back) to ${OUT}`);
}

main();
