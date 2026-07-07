// Global flight snapshot for the ambient "live-ish" aviation layer. Fetches one
// worldwide snapshot of airborne aircraft from the OpenSky Network (free, no key,
// anonymous — server-side so CORS doesn't apply) and bundles a compact, sampled
// subset as static JSON. This is a STILL SNAPSHOT (not real time); the globe
// gently dead-reckons each aircraft forward for a living-planet effect. Real-time
// data is only fetched (throttled, per viewport) when the user zooms in, via a
// proxy — see worker/flights.mjs. Re-run: `node scripts/ingest-flights.mjs`.
//
// Compact record: [lat, lng, trackDeg, velMs, altKm] (rounded to shrink bundle).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/flights-snapshot.json");
const CAP = 7000; // sampled max, balances density (wow) vs. bundle size + GPU

async function main() {
  console.log("Fetching global flight snapshot from OpenSky…");
  const res = await fetch("https://opensky-network.org/api/states/all");
  if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
  const json = await res.json();
  const states = json.states || [];

  // OpenSky state vector indices: [0]icao24 [1]callsign [5]lon [6]lat
  // [7]baro_altitude(m) [8]on_ground [9]velocity(m/s) [10]true_track(deg)
  let flights = states
    .filter((s) => s[5] != null && s[6] != null && s[8] === false && s[9] != null)
    .map((s) => [
      Math.round(s[6] * 100) / 100, // lat
      Math.round(s[5] * 100) / 100, // lng
      Math.round(s[10] ?? 0), // track deg
      Math.round(s[9]), // velocity m/s
      Math.round(((s[7] ?? 0) / 1000) * 10) / 10, // altitude km
    ]);

  // Even down-sampling if the snapshot is larger than the cap.
  if (flights.length > CAP) {
    const stride = flights.length / CAP;
    const sampled = [];
    for (let i = 0; i < flights.length; i += stride) sampled.push(flights[Math.floor(i)]);
    flights = sampled;
  }

  const out = {
    asOf: new Date().toISOString(),
    source: "OpenSky Network (opensky-network.org) — anonymous snapshot",
    count: flights.length,
    flights,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log(`Wrote ${flights.length} aircraft to ${OUT}`);
}

main().catch((e) => {
  console.error("Flight ingestion failed:", e.message);
  process.exit(1);
});
