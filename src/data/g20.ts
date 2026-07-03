// Static G20 snapshot for the prototype (approximate, ~2024/2025 values).
//
// These numbers are curated "directionally real" figures to seed the sandbox
// scenario — NOT an authoritative dataset. Fase 0 replaces this with a
// versioned JSON generated from World Bank / IMF / Comtrade (see plan §3).
//
// GDP in trillions USD (nominal). Rates & inflation in % per year.
// exportShare / importShare are goods+services trade as a fraction of GDP.

export interface G20Datum {
  iso: number; // ISO 3166-1 numeric
  name: string; // display name
  lat: number;
  lng: number;
  gdp0: number;
  rate0: number; // current central-bank policy rate
  infl0: number; // current annual inflation
  potentialGrowth: number;
  neutralRate: number;
  inflTarget: number;
  exportShare: number;
  importShare: number;
}

export const G20: G20Datum[] = [
  { iso: 32,  name: "Argentina",     lat: -38.4, lng: -63.6,  gdp0: 0.64,  rate0: 35,   infl0: 30,  potentialGrowth: 2.0, neutralRate: 14, inflTarget: 10, exportShare: 0.13, importShare: 0.13 },
  { iso: 36,  name: "Australia",     lat: -25.3, lng: 133.8,  gdp0: 1.75,  rate0: 4.35, infl0: 3.5, potentialGrowth: 2.3, neutralRate: 3.0, inflTarget: 2.5, exportShare: 0.24, importShare: 0.21 },
  { iso: 76,  name: "Brazil",        lat: -14.2, lng: -51.9,  gdp0: 2.17,  rate0: 10.5, infl0: 4.5, potentialGrowth: 2.0, neutralRate: 5.0, inflTarget: 3.0, exportShare: 0.17, importShare: 0.16 },
  { iso: 124, name: "Canada",        lat: 56.1,  lng: -106.3, gdp0: 2.14,  rate0: 4.5,  infl0: 2.9, potentialGrowth: 1.8, neutralRate: 2.75, inflTarget: 2.0, exportShare: 0.33, importShare: 0.34 },
  { iso: 156, name: "China",         lat: 35.9,  lng: 104.2,  gdp0: 18.5,  rate0: 3.1,  infl0: 0.5, potentialGrowth: 4.5, neutralRate: 3.0, inflTarget: 2.0, exportShare: 0.20, importShare: 0.17 },
  { iso: 250, name: "France",        lat: 46.6,  lng: 2.2,    gdp0: 3.1,   rate0: 4.0,  infl0: 2.4, potentialGrowth: 1.3, neutralRate: 2.0, inflTarget: 2.0, exportShare: 0.33, importShare: 0.35 },
  { iso: 276, name: "Germany",       lat: 51.2,  lng: 10.4,   gdp0: 4.5,   rate0: 4.0,  infl0: 2.4, potentialGrowth: 1.2, neutralRate: 2.0, inflTarget: 2.0, exportShare: 0.47, importShare: 0.41 },
  { iso: 356, name: "India",         lat: 22.4,  lng: 78.7,   gdp0: 3.9,   rate0: 6.5,  infl0: 5.0, potentialGrowth: 6.5, neutralRate: 5.5, inflTarget: 4.0, exportShare: 0.22, importShare: 0.24 },
  { iso: 360, name: "Indonesia",     lat: -2.5,  lng: 118.0,  gdp0: 1.4,   rate0: 6.0,  infl0: 2.8, potentialGrowth: 5.0, neutralRate: 4.5, inflTarget: 3.0, exportShare: 0.22, importShare: 0.20 },
  { iso: 380, name: "Italy",         lat: 41.9,  lng: 12.6,   gdp0: 2.3,   rate0: 4.0,  infl0: 1.2, potentialGrowth: 0.8, neutralRate: 2.0, inflTarget: 2.0, exportShare: 0.32, importShare: 0.30 },
  { iso: 392, name: "Japan",         lat: 36.2,  lng: 138.3,  gdp0: 4.1,   rate0: 0.25, infl0: 2.8, potentialGrowth: 0.8, neutralRate: 1.0, inflTarget: 2.0, exportShare: 0.21, importShare: 0.23 },
  { iso: 484, name: "Mexico",        lat: 23.6,  lng: -102.5, gdp0: 1.8,   rate0: 10.75, infl0: 4.6, potentialGrowth: 2.0, neutralRate: 5.0, inflTarget: 3.0, exportShare: 0.40, importShare: 0.41 },
  { iso: 643, name: "Russia",        lat: 61.5,  lng: 105.3,  gdp0: 2.0,   rate0: 18,   infl0: 8.5, potentialGrowth: 1.5, neutralRate: 7.0, inflTarget: 4.0, exportShare: 0.28, importShare: 0.20 },
  { iso: 682, name: "Saudi Arabia",  lat: 23.9,  lng: 45.1,   gdp0: 1.1,   rate0: 6.0,  infl0: 1.7, potentialGrowth: 3.0, neutralRate: 3.0, inflTarget: 2.0, exportShare: 0.32, importShare: 0.28 },
  { iso: 710, name: "South Africa",  lat: -30.6, lng: 22.9,   gdp0: 0.4,   rate0: 8.25, infl0: 4.6, potentialGrowth: 1.2, neutralRate: 4.0, inflTarget: 4.5, exportShare: 0.30, importShare: 0.30 },
  { iso: 410, name: "South Korea",   lat: 35.9,  lng: 127.8,  gdp0: 1.7,   rate0: 3.5,  infl0: 2.6, potentialGrowth: 2.0, neutralRate: 2.5, inflTarget: 2.0, exportShare: 0.44, importShare: 0.42 },
  { iso: 792, name: "Turkey",        lat: 39.0,  lng: 35.2,   gdp0: 1.1,   rate0: 45,   infl0: 45,  potentialGrowth: 3.5, neutralRate: 18, inflTarget: 5.0, exportShare: 0.30, importShare: 0.35 },
  { iso: 826, name: "United Kingdom", lat: 55.4, lng: -3.4,   gdp0: 3.3,   rate0: 5.0,  infl0: 2.2, potentialGrowth: 1.3, neutralRate: 2.5, inflTarget: 2.0, exportShare: 0.32, importShare: 0.33 },
  { iso: 840, name: "United States", lat: 39.8,  lng: -98.6,  gdp0: 28.8,  rate0: 5.0,  infl0: 3.0, potentialGrowth: 2.0, neutralRate: 3.0, inflTarget: 2.0, exportShare: 0.11, importShare: 0.14 },
];

/** Fast lookup by ISO numeric code. */
export const G20_BY_ISO: Record<number, G20Datum> = Object.fromEntries(
  G20.map((d) => [d.iso, d]),
);

/** Fast lookup by display name (fallback join for the France/-99 quirk). */
export const G20_BY_NAME: Record<string, G20Datum> = Object.fromEntries(
  G20.map((d) => [d.name, d]),
);
