// Country snapshot consumed by the app. Despite the historical name, this now
// holds ~155 countries (every world-atlas polygon with World Bank GDP), not just
// the G20. The economic values (gdp0, infl0, potentialGrowth, export/import
// shares) come from real World Bank data via the Fase 0/1 ingestion pipeline
// (scripts/ingest.mjs -> generated/g20-snapshot.json). Monetary/social anchors
// are curated for the G20 and derived for the rest. Re-run `node scripts/ingest.mjs`.

import snapshot from "./generated/g20-snapshot.json";

export interface G20Datum {
  iso: number; // ISO 3166-1 numeric
  name: string; // display name
  lat: number;
  lng: number;
  gdp0: number; // nominal GDP, trillions USD (World Bank)
  rate0: number; // current central-bank policy rate (curated)
  infl0: number; // current annual inflation (World Bank CPI)
  potentialGrowth: number; // ~10yr avg real growth (World Bank)
  neutralRate: number; // neutral policy rate (curated)
  inflTarget: number; // inflation anchor (curated)
  exportShare: number; // exports as share of GDP (World Bank)
  importShare: number; // imports as share of GDP (World Bank)
  // ---- Social / fiscal / demographic anchors (Fase 1) ----
  unemployment0: number; // current unemployment, % (World Bank)
  nairu: number; // natural unemployment rate, % (curated)
  debt0: number; // gross public debt, % of GDP (World Bank/IMF)
  gini0: number; // inequality, Gini index 0..100 (World Bank/curated)
  poverty0: number; // poverty headcount, % (World Bank/curated)
  population0: number; // population, millions (World Bank)
  popGrowth: number; // population growth, % per year (World Bank)
  dependencyRatio: number; // age dependency ratio, % (World Bank)
  taxBaseline: number; // baseline tax burden, % of GDP (World Bank/curated)
  approval0: number; // starting public approval, 0..100 (curated)
  commodityExporter: number; // net commodity exposure, -1..+1 (curated)
}

/** As-of date + provenance of the generated snapshot. */
export const SNAPSHOT_META = { asOf: snapshot.asOf, source: snapshot.source };

// Defensive fallbacks: the social/fiscal anchors were added in Fase 1. If the
// generated snapshot predates the extended `scripts/ingest.mjs` run, fill neutral
// defaults so the engine never reads `undefined` (→ NaN). Re-run `npm run ingest`
// to populate real values.
const withDefaults = (c: Record<string, number | string>): G20Datum => ({
  ...(c as unknown as G20Datum),
  unemployment0: (c.unemployment0 as number) ?? 6,
  nairu: (c.nairu as number) ?? 5,
  debt0: (c.debt0 as number) ?? 60,
  gini0: (c.gini0 as number) ?? 40,
  poverty0: (c.poverty0 as number) ?? 12,
  population0: (c.population0 as number) ?? 50,
  popGrowth: (c.popGrowth as number) ?? 0.7,
  dependencyRatio: (c.dependencyRatio as number) ?? 55,
  taxBaseline: (c.taxBaseline as number) ?? 20,
  approval0: (c.approval0 as number) ?? 52,
  commodityExporter: (c.commodityExporter as number) ?? 0,
});

export const G20: G20Datum[] = (
  snapshot.countries as unknown as Array<Record<string, number | string>>
).map(withDefaults);

/** Fast lookup by ISO numeric code. */
export const G20_BY_ISO: Record<number, G20Datum> = Object.fromEntries(
  G20.map((d) => [d.iso, d]),
);

/** Fast lookup by display name (fallback join for the France/-99 quirk). */
export const G20_BY_NAME: Record<string, G20Datum> = Object.fromEntries(
  G20.map((d) => [d.name, d]),
);
