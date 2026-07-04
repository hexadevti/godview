// Fase 0 (trade) — bilateral trade ingestion from UN Comtrade.
//
//   node scripts/ingest-trade.mjs                      (public preview, no key)
//   $env:COMTRADE_KEY="<key>"; npm run ingest:trade    (authenticated, higher limits)
//
// One call per reporter fetches its total goods exports to every partner; we
// keep the G20 partners. Comtrade uses a few NON-ISO reporter/partner codes
// (US=842, France=251, India=699), which we translate to/from ISO 3166-1
// numeric so they line up with the rest of the app.
//
// Output: src/data/generated/trade-flows.json

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/generated/trade-flows.json");

// Load COMTRADE_KEY from the gitignored .env if it isn't already in the env
// (a CLI env var still takes precedence). The app/vite never see this.
if (!process.env.COMTRADE_KEY) {
  try {
    process.loadEnvFile(resolve(__dirname, "../.env"));
  } catch {
    /* no .env — fall back to public preview */
  }
}
const KEY = process.env.COMTRADE_KEY || "";
const PERIOD = "2023";
const MIN_BILLIONS = 2;

const G20 = [
  { iso: 32, name: "Argentina" }, { iso: 36, name: "Australia" }, { iso: 76, name: "Brazil" },
  { iso: 124, name: "Canada" }, { iso: 156, name: "China" }, { iso: 250, name: "France" },
  { iso: 276, name: "Germany" }, { iso: 356, name: "India" }, { iso: 360, name: "Indonesia" },
  { iso: 380, name: "Italy" }, { iso: 392, name: "Japan" }, { iso: 484, name: "Mexico" },
  { iso: 643, name: "Russia" }, { iso: 682, name: "Saudi Arabia" }, { iso: 710, name: "South Africa" },
  { iso: 410, name: "South Korea" }, { iso: 792, name: "Turkey" }, { iso: 826, name: "United Kingdom" },
  { iso: 840, name: "United States" },
];
const G20_ISO = new Set(G20.map((c) => c.iso));

// Comtrade uses non-ISO codes for a few countries.
const ISO_TO_COMTRADE = { 840: 842, 250: 251, 356: 699 };
const COMTRADE_TO_ISO = { 842: 840, 251: 250, 699: 356 };
const toComtrade = (iso) => ISO_TO_COMTRADE[iso] ?? iso;
const toIso = (code) => COMTRADE_TO_ISO[code] ?? code;

// Russia stopped reporting detailed trade to Comtrade after 2022, so its EXPORTS
// are absent. Curated public 2023 estimates (post-sanctions reoriented to Asia).
const RUSSIA_EXPORTS = [
  [643, 156, 129], [643, 356, 60], [643, 792, 45], [643, 76, 10],
  [643, 410, 10], [643, 392, 9], [643, 276, 8], [643, 380, 5],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchReporter(iso, flow) {
  const base = KEY
    ? "https://comtradeapi.un.org/data/v1/get/C/A/HS"
    : "https://comtradeapi.un.org/public/v1/preview/C/A/HS";
  const url =
    `${base}?reporterCode=${toComtrade(iso)}&period=${PERIOD}&flowCode=${flow}&cmdCode=TOTAL` +
    `&motCode=0&partner2Code=0&customsCode=C00`;
  const opts = KEY ? { headers: { "Ocp-Apim-Subscription-Key": KEY } } : {};
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, opts);
      if (res.status === 429) throw new Error("HTTP 429"); // rate limited
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).data || [];
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(e.message.includes("429") ? 8000 : 2000); // back off harder on 429
    }
  }
  return [];
}

async function main() {
  console.log(`Fetching G20 bilateral trade (${PERIOD}) via ${KEY ? "authenticated API (key)" : "public preview"}…`);
  const map = new Map(); // "from-to" -> value (exports authoritative; imports fill gaps via mirror)

  // Pass 1 — each reporter's EXPORTS (from -> partner).
  for (const reporter of G20) {
    const rows = await fetchReporter(reporter.iso, "X");
    let kept = 0;
    for (const r of rows) {
      const partner = toIso(r.partnerCode);
      if (!G20_ISO.has(partner) || partner === reporter.iso) continue;
      const value = Math.round((r.primaryValue || 0) / 1e9);
      if (value < MIN_BILLIONS) continue;
      map.set(`${reporter.iso}-${partner}`, value);
      kept++;
    }
    console.log(`  ${reporter.name.padEnd(15)} ${String(rows.length).padStart(3)} partners -> ${kept}`);
    await sleep(1200);
  }

  // Fill Russia's absent exports from curated estimates.
  let supplemented = 0;
  for (const [from, to, value] of RUSSIA_EXPORTS) {
    const key = `${from}-${to}`;
    if (!map.has(key)) { map.set(key, value); supplemented++; }
  }

  const flows = [...map.entries()]
    .map(([k, value]) => {
      const [from, to] = k.split("-").map(Number);
      return { from, to, value };
    })
    .sort((a, b) => b.value - a.value);
  const out = {
    asOf: new Date().toISOString().slice(0, 10),
    period: PERIOD,
    source: "UN Comtrade — total goods (HS), all modes; Russia exports curated (not reported since 2022)",
    flows,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${flows.length} flows (${flows.length - supplemented} real, ${supplemented} Russia curated) to ${OUT}`);
  console.log("Top 10:", flows.slice(0, 10).map((f) => `${f.from}->${f.to}:$${f.value}b`).join("  "));
}

main().catch((e) => {
  console.error("Trade ingestion failed:", e.message);
  process.exit(1);
});
