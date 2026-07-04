// Fase 0 (comms) — satellites from Celestrak TLE (real orbital elements). We
// sample a subset per constellation; the app propagates positions with
// satellite.js (SGP4) and animates them. Output: src/data/generated/satellites.json
//
//   node scripts/ingest-satellites.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/satellites.json");

// group -> { url, sample (keep 1 of N), cap }. LEO constellations give the close
// "shell"; GPS (MEO) and GEO sit higher (altitude compressed for display).
const GROUPS = [
  { group: "oneweb", url: "GROUP=oneweb", sample: 3, cap: 220 }, // LEO
  { group: "iridium", url: "GROUP=iridium-NEXT", sample: 1, cap: 80 }, // LEO
  { group: "gps", url: "GROUP=gps-ops", sample: 1, cap: 32 }, // MEO
  { group: "geo", url: "GROUP=geo", sample: 6, cap: 60 }, // GEO belt
];

async function fetchTle(q) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?${q}&FORMAT=tle`;
  return (await (await fetch(url)).text()).trim().split("\n").map((l) => l.trim());
}

async function main() {
  console.log("Fetching satellite TLE (Celestrak)…");
  const sats = [];
  for (const g of GROUPS) {
    const lines = await fetchTle(g.url);
    let idx = 0;
    let kept = 0;
    for (let i = 0; i + 2 < lines.length && kept < g.cap; i += 3) {
      if (idx++ % g.sample !== 0) continue;
      const name = lines[i];
      const l1 = lines[i + 1];
      const l2 = lines[i + 2];
      if (!l1?.startsWith("1 ") || !l2?.startsWith("2 ")) continue;
      sats.push({ name, l1, l2, group: g.group });
      kept++;
    }
    console.log(`  ${g.group.padEnd(9)} kept ${kept}`);
    await new Promise((r) => setTimeout(r, 500));
  }

  const out = {
    asOf: new Date().toISOString().slice(0, 10),
    source: "Celestrak GP/TLE (celestrak.org) — sampled per constellation",
    sats,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log(`Wrote ${sats.length} satellites to ${OUT}`);
}

main().catch((e) => { console.error("Satellite ingestion failed:", e.message); process.exit(1); });
