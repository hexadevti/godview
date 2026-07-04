// Fase 0 (comms) — submarine cables from TeleGeography's open Submarine Cable
// Map data. Each cable is one or more line segments; we downsample and flatten
// them for the globe. Output: src/data/generated/cables.json
//
//   node scripts/ingest-cables.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/cables.json");
const URL = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json";
const MAX_PTS = 12;

function decimate(coords, max) {
  if (coords.length <= max) return coords;
  const out = [];
  const step = (coords.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(coords[Math.round(i * step)]);
  return out;
}

async function main() {
  console.log("Fetching submarine cables (TeleGeography)…");
  const geo = await (await fetch(URL)).json();
  const segments = [];
  for (const f of geo.features || []) {
    const name = f.properties?.name || "";
    const g = f.geometry;
    const lines = g.type === "MultiLineString" ? g.coordinates : g.type === "LineString" ? [g.coordinates] : [];
    for (const line of lines) {
      if (!line || line.length < 2) continue;
      const w = decimate(line, MAX_PTS).map(([lng, lat]) => [
        Math.round(lat * 100) / 100,
        Math.round(lng * 100) / 100,
      ]);
      segments.push({ n: name, w });
    }
  }

  const out = {
    asOf: new Date().toISOString().slice(0, 10),
    source: "TeleGeography Submarine Cable Map (submarinecablemap.com, open data)",
    segments,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log(`Wrote ${segments.length} cable segments (${geo.features.length} cables) to ${OUT}`);
}

main().catch((e) => { console.error("Cable ingestion failed:", e.message); process.exit(1); });
