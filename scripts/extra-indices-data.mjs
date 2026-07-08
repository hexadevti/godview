// Seven governance / wellbeing indices, keyed by ISO 3166-1 alpha-3. All are real
// published indices with no free bulk API, so they are curated here (with an
// HDI-based fallback for countries a given table doesn't cover). Shared by
// scripts/ingest.mjs and scripts/patch-extra-indices.mjs.
//
//   econFreedom  — Index of Economic Freedom (Heritage Foundation 2024), 0..100
//   cpi          — Corruption Perceptions Index (Transparency Int'l 2023), 0..100 (higher = cleaner)
//   democracy    — Democracy Index (EIU 2023), 0..10
//   pressFreedom — Press Freedom Index (RSF 2024), 0..100 (higher = freer)
//   spi          — Social Progress Index (2023), 0..100
//   happiness    — World Happiness Report (2024 life ladder), 0..10
//   homicide     — Intentional homicide rate (UNODC, ~2021), per 100k inhabitants (lower = safer)

export const ECON_FREEDOM = {
  USA: 70, CHN: 48, DEU: 73, JPN: 69, GBR: 73, IND: 53, FRA: 63, RUS: 53, ITA: 62,
  CAN: 74, BRA: 53, ESP: 65, KOR: 73, MEX: 63, AUS: 75, TUR: 56, IDN: 64, NLD: 78,
  SAU: 62, CHE: 83, POL: 68, BEL: 68, IRL: 82, ARG: 51, SWE: 77, ISR: 68, AUT: 71,
  THA: 62, ARE: 71, NOR: 76, VNM: 62, PHL: 59, MYS: 68, DNK: 78, COL: 64, BGD: 56,
  ROU: 66, ZAF: 56, PAK: 51, CZE: 72, EGY: 49, IRN: 43, CHL: 71, PRT: 68, PER: 63,
  FIN: 77, KAZ: 62, NGA: 53, DZA: 43, GRC: 58, NZL: 79, HUN: 64, QAT: 71, UKR: 51,
  MAR: 59, KWT: 63, SVK: 66, KEN: 55, BGR: 70, ECU: 55, LUX: 79, SRB: 64, VEN: 26,
  LTU: 73, BLR: 51, URY: 70, SVN: 68, JOR: 63, TUN: 52, LVA: 71, EST: 78, ISL: 77,
  GEO: 69, ALB: 65, ARM: 66, LBN: 51, MNG: 56, BWA: 68, CUB: 25, CRI: 66, PAN: 65,
};

export const CPI = {
  USA: 69, CHN: 42, DEU: 78, JPN: 73, GBR: 71, IND: 39, FRA: 71, RUS: 26, ITA: 56,
  CAN: 76, BRA: 36, ESP: 60, KOR: 63, MEX: 31, AUS: 75, TUR: 34, IDN: 34, NLD: 79,
  SAU: 52, CHE: 82, POL: 54, BEL: 73, IRL: 77, ARG: 37, SWE: 82, ISR: 62, AUT: 71,
  THA: 35, ARE: 68, NOR: 84, VNM: 41, PHL: 34, MYS: 50, DNK: 90, COL: 40, BGD: 24,
  ROU: 46, ZAF: 41, PAK: 29, CZE: 57, EGY: 35, IRN: 24, CHL: 66, PRT: 61, PER: 33,
  FIN: 87, KAZ: 39, NGA: 25, DZA: 36, GRC: 49, NZL: 85, HUN: 42, QAT: 58, UKR: 36,
  MAR: 38, KWT: 46, SVK: 54, KEN: 31, BGR: 45, ECU: 34, LUX: 78, SRB: 36, VEN: 13,
  LTU: 61, BLR: 37, URY: 73, SVN: 56, JOR: 46, TUN: 40, LVA: 60, EST: 76, ISL: 72,
  GEO: 53, ALB: 37, ARM: 47, LBN: 24, MNG: 33, BWA: 59, CUB: 42, CRI: 55, PAN: 37,
};

export const DEMOCRACY = {
  USA: 7.85, CHN: 2.12, DEU: 8.8, JPN: 8.4, GBR: 8.28, IND: 7.18, FRA: 8.07, RUS: 2.22,
  ITA: 7.69, CAN: 8.65, BRA: 6.68, ESP: 8.07, KOR: 8.09, MEX: 5.14, AUS: 8.66, TUR: 4.33,
  IDN: 6.53, NLD: 9.0, SAU: 2.08, CHE: 9.14, POL: 7.18, BEL: 7.64, IRL: 9.19, ARG: 6.62,
  SWE: 9.39, ISR: 7.8, AUT: 8.28, THA: 6.35, ARE: 2.9, NOR: 9.81, VNM: 2.62, PHL: 6.66,
  MYS: 7.3, DNK: 9.28, COL: 6.55, BGD: 5.87, ROU: 6.45, ZAF: 7.05, PAK: 3.25, CZE: 7.97,
  EGY: 2.93, IRN: 1.96, CHL: 8.22, PRT: 7.95, PER: 5.7, FIN: 9.3, KAZ: 3.08, NGA: 4.23,
  DZA: 3.66, GRC: 7.97, NZL: 9.61, HUN: 6.64, QAT: 3.65, UKR: 5.06, MAR: 5.04, KWT: 3.83,
  SVK: 7.07, KEN: 5.05, BGR: 6.45, ECU: 6.13, LUX: 8.81, SRB: 6.33, VEN: 2.7, LTU: 7.31,
  BLR: 1.99, URY: 8.66, SVN: 7.75, JOR: 3.17, TUN: 5.51, LVA: 7.38, EST: 7.96, ISL: 9.45,
  GEO: 5.2, ALB: 6.41, ARM: 5.42, LBN: 3.56, MNG: 6.5, BWA: 7.73, CUB: 2.65, CRI: 8.29, PAN: 7.15,
};

export const PRESS_FREEDOM = {
  USA: 66, CHN: 23, DEU: 83, JPN: 69, GBR: 78, IND: 32, FRA: 79, RUS: 30, ITA: 70,
  CAN: 82, BRA: 66, ESP: 78, KOR: 72, MEX: 51, AUS: 77, TUR: 32, IDN: 52, NLD: 88,
  SAU: 26, CHE: 85, POL: 68, BEL: 84, IRL: 89, ARG: 68, SWE: 88, ISR: 61, AUT: 79,
  THA: 51, ARE: 41, NOR: 92, VNM: 24, PHL: 52, MYS: 52, DNK: 89, COL: 58, BGD: 45,
  ROU: 71, ZAF: 78, PAK: 44, CZE: 79, EGY: 33, IRN: 21, CHL: 73, PRT: 86, PER: 60,
  FIN: 87, KAZ: 41, NGA: 52, DZA: 43, GRC: 62, NZL: 82, HUN: 58, QAT: 46, UKR: 65,
  MAR: 45, KWT: 51, SVK: 74, KEN: 65, BGR: 60, ECU: 62, LUX: 84, SRB: 62, VEN: 40,
  LTU: 82, BLR: 25, URY: 79, SVN: 78, JOR: 50, TUN: 62, LVA: 84, EST: 86, ISL: 84,
  GEO: 61, ALB: 62, ARM: 68, LBN: 55, MNG: 68, BWA: 72, CUB: 26, CRI: 82, PAN: 68,
};

export const SPI = {
  USA: 86, CHN: 66, DEU: 90, JPN: 90, GBR: 89, IND: 60, FRA: 88, RUS: 68, ITA: 86,
  CAN: 90, BRA: 73, ESP: 88, KOR: 87, MEX: 74, AUS: 90, TUR: 68, IDN: 65, NLD: 91,
  SAU: 67, CHE: 91, POL: 84, BEL: 89, IRL: 90, ARG: 81, SWE: 91, ISR: 82, AUT: 89,
  THA: 72, ARE: 76, NOR: 92, VNM: 68, PHL: 70, MYS: 74, DNK: 92, COL: 71, BGD: 58,
  ROU: 78, ZAF: 68, PAK: 53, CZE: 86, EGY: 62, IRN: 63, CHL: 83, PRT: 87, PER: 72,
  FIN: 92, KAZ: 70, NGA: 52, DZA: 65, GRC: 84, NZL: 90, HUN: 81, QAT: 72, UKR: 72,
  MAR: 63, KWT: 72, SVK: 84, KEN: 60, BGR: 78, ECU: 72, LUX: 89, SRB: 78, VEN: 62,
  LTU: 85, BLR: 74, URY: 84, SVN: 88, JOR: 68, TUN: 68, LVA: 84, EST: 87, ISL: 92,
  GEO: 76, ALB: 76, ARM: 74, LBN: 63, MNG: 68, BWA: 66, CUB: 74, CRI: 82, PAN: 76,
};

export const HAPPINESS = {
  USA: 6.72, CHN: 5.97, DEU: 6.75, JPN: 6.06, GBR: 6.75, IND: 4.05, FRA: 6.66, RUS: 5.79,
  ITA: 6.32, CAN: 6.9, BRA: 6.27, ESP: 6.42, KOR: 6.06, MEX: 6.68, AUS: 7.06, TUR: 4.55,
  IDN: 5.57, NLD: 7.32, SAU: 6.59, CHE: 7.06, POL: 6.44, BEL: 6.9, IRL: 6.84, ARG: 6.19,
  SWE: 7.34, ISR: 7.34, AUT: 7.1, THA: 5.98, ARE: 6.73, NOR: 7.3, VNM: 6.05, PHL: 5.98,
  MYS: 6.01, DNK: 7.58, COL: 5.77, BGD: 3.89, ROU: 6.49, ZAF: 5.42, PAK: 4.66, CZE: 6.85,
  EGY: 3.98, IRN: 4.92, CHL: 6.33, PRT: 6.03, PER: 5.53, FIN: 7.74, KAZ: 6.02, NGA: 4.98,
  DZA: 5.36, GRC: 5.93, NZL: 7.02, HUN: 6.02, QAT: 6.6, UKR: 4.87, MAR: 4.62, KWT: 6.95,
  SVK: 6.47, KEN: 4.49, BGR: 5.47, ECU: 5.97, LUX: 7.12, SRB: 6.3, VEN: 5.68, LTU: 6.82,
  BLR: 5.52, URY: 6.4, SVN: 6.65, JOR: 4.19, TUN: 4.42, LVA: 6.21, EST: 6.45, ISL: 7.53,
  GEO: 4.89, ALB: 5.3, ARM: 5.3, LBN: 2.71, MNG: 5.69, BWA: 3.44, CUB: 5.5, CRI: 6.61, PAN: 6.36,
};

// Intentional homicides per 100,000 inhabitants (UNODC / national sources, most
// recent ~2021). Higher = more violent. Note the wide spread: Latin America and
// parts of Africa run 20–40+, while much of Europe/East Asia sits below 1.
export const HOMICIDE = {
  USA: 6.8, CHN: 0.5, DEU: 0.9, JPN: 0.2, GBR: 1.0, IND: 2.9, FRA: 1.1, RUS: 7.3, ITA: 0.5,
  CAN: 2.0, BRA: 22.0, ESP: 0.6, KOR: 0.5, MEX: 26.0, AUS: 0.9, TUR: 2.5, IDN: 0.4, NLD: 0.6,
  SAU: 1.3, CHE: 0.5, POL: 0.7, BEL: 1.1, IRL: 0.7, ARG: 5.3, SWE: 1.1, ISR: 1.8, AUT: 0.9,
  THA: 3.2, ARE: 0.5, NOR: 0.5, VNM: 1.5, PHL: 6.5, MYS: 2.1, DNK: 0.6, COL: 27.0, BGD: 2.4,
  ROU: 1.2, ZAF: 41.0, PAK: 3.8, CZE: 0.9, EGY: 1.2, IRN: 2.5, CHL: 4.5, PRT: 0.8, PER: 8.0,
  FIN: 1.6, KAZ: 4.5, NGA: 21.0, DZA: 1.4, GRC: 0.9, NZL: 1.3, HUN: 0.9, QAT: 0.5, UKR: 6.0,
  MAR: 1.4, KWT: 1.4, SVK: 1.4, KEN: 5.0, BGR: 1.2, ECU: 26.0, LUX: 0.8, SRB: 1.3, VEN: 40.0,
  LTU: 3.5, BLR: 2.4, URY: 8.5, SVN: 0.5, JOR: 1.6, TUN: 3.1, LVA: 3.4, EST: 2.0, ISL: 0.3,
  GEO: 1.9, ALB: 2.3, ARM: 1.8, LBN: 4.0, MNG: 5.0, BWA: 15.0, CUB: 5.0, CRI: 12.5, PAN: 11.5,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r0 = (v) => Math.round(v);
const r1 = (v) => Math.round(v * 10) / 10;

// HDI-based fallbacks: all six indices correlate strongly with human
// development. Coarse but bounded and directionally right — only reached for
// countries a table doesn't cover (mostly small / fragile states).
const fb = {
  econFreedom: (h) => clamp(r0(28 + 58 * (h - 0.4)), 20, 85),
  cpi: (h) => clamp(r0(12 + 92 * (h - 0.4)), 8, 88),
  democracy: (h) => clamp(r1(1.8 + 8 * (h - 0.4)), 1, 9),
  pressFreedom: (h) => clamp(r0(20 + 82 * (h - 0.45)), 15, 92),
  spi: (h) => clamp(r0(102 * h - 9), 28, 96),
  happiness: (h) => clamp(r1(2.4 + 5.6 * (h - 0.4)), 2.8, 7.6),
  // Violence correlates only weakly (and noisily) with human development, so this
  // is a coarse, bounded guess — only reached for small/fragile states the table
  // doesn't cover. Higher HDI → lower assumed rate.
  homicide: (h) => clamp(r1(18 - 22 * (h - 0.4)), 0.4, 40),
};

const TABLES = {
  econFreedom: ECON_FREEDOM,
  cpi: CPI,
  democracy: DEMOCRACY,
  pressFreedom: PRESS_FREEDOM,
  spi: SPI,
  happiness: HAPPINESS,
  homicide: HOMICIDE,
};

/** Resolve all seven indices for a country given its iso3 + HDI (for fallbacks).
 *  Returns { econFreedom0, cpi0, democracy0, pressFreedom0, spi0, happiness0, homicide0 }. */
export function resolveExtraIndices(iso3, hdi0) {
  const out = {};
  for (const key of Object.keys(TABLES)) {
    const real = iso3 != null ? TABLES[key][iso3] : undefined;
    out[`${key}0`] = real != null ? real : fb[key](hdi0 ?? 0.6);
  }
  return out;
}

export { TABLES as EXTRA_INDEX_TABLES };
