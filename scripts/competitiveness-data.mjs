// Global Competitiveness Index (GCI 4.0) reference table, keyed by ISO 3166-1
// alpha-3 code. World Economic Forum, 2019 edition (the last full GCI 4.0 — the
// 2020 report was a special edition with no ranking). Score 0..100 (higher =
// more competitive: institutions, infrastructure, ICT, macro stability, health,
// skills, product/labor/financial markets, market size, business dynamism and
// innovation capability). The WEF ranked 141 economies; countries it did not
// cover fall back to an HDI-based estimate. This is a real published index but
// has no free bulk API, so it is curated here. Shared by scripts/ingest.mjs and
// scripts/patch-competitiveness.mjs.

export const COMPETITIVENESS = {
  USA: 83.7, CHN: 73.9, DEU: 81.8, JPN: 82.3, GBR: 81.2, IND: 61.4, FRA: 78.8,
  RUS: 66.7, ITA: 71.5, CAN: 79.6, BRA: 60.9, ESP: 75.3, KOR: 79.6, MEX: 64.9,
  AUS: 78.7, TUR: 62.1, IDN: 64.6, NLD: 82.4, SAU: 70.0, CHE: 82.3, POL: 68.9,
  BEL: 76.4, IRL: 75.1, ARG: 57.2, SWE: 81.2, ISR: 76.7, AUT: 76.6, THA: 68.1,
  ARE: 75.0, NOR: 78.1, VNM: 61.5, PHL: 61.9, MYS: 74.6, DNK: 81.2, COL: 62.7,
  BGD: 52.1, ROU: 64.4, ZAF: 62.4, PAK: 51.4, CZE: 70.9, EGY: 54.5, IRN: 53.0,
  CHL: 70.5, PRT: 70.4, PER: 61.7, FIN: 80.2, KAZ: 62.9, NGA: 48.3, DZA: 56.3,
  GRC: 62.6, NZL: 76.7, HUN: 65.1, QAT: 72.9, UKR: 57.0, MAR: 60.0, KWT: 65.1,
  SVK: 66.8, KEN: 54.1, BGR: 64.9, ECU: 55.7, DOM: 58.3, ETH: 44.4, GTM: 53.5,
  AGO: 38.1, GHA: 51.2, OMN: 63.6, LKA: 57.1, HRV: 61.9, CRI: 62.0, LUX: 77.0,
  CIV: 48.1, SRB: 60.9, VEN: 41.8, LTU: 68.4, COD: 36.1, PAN: 61.6, TZA: 48.2,
  URY: 63.5, SVN: 70.2, AZE: 62.7, BOL: 51.8, JOR: 60.9, UGA: 48.9, CMR: 48.3,
  TUN: 56.4, KHM: 52.1, ZWE: 44.2, LVA: 67.0, PRY: 53.6, EST: 70.9, NPL: 51.6,
  CYP: 66.4, HND: 52.7, ISL: 74.7, GEO: 60.9, SEN: 49.7, SLV: 52.8, BIH: 54.7,
  HTI: 36.3, ALB: 57.0, MLI: 43.6, ARM: 61.3, ZMB: 46.5, BFA: 43.4, GIN: 46.0,
  LBN: 56.3, TTO: 58.3, BEN: 45.8, MNG: 52.6, JAM: 58.3, KGZ: 54.0, MOZ: 43.0,
  NIC: 51.5, YEM: 35.5, TCD: 35.1, BWA: 55.5, MDA: 56.7, MDG: 44.4, MKD: 57.3,
  LAO: 50.1, TJK: 52.4, RWA: 52.8, BRN: 62.8, MWI: 43.6, NAM: 54.5, MRT: 45.3,
  TGO: 44.0, MNE: 60.8, SLE: 43.0, SWZ: 45.0, GMB: 45.6, LSO: 42.9,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

// Fallback for countries the WEF didn't rank (fragile states, small islands):
// competitiveness tracks overall development, so estimate from HDI (0..1).
export function competitivenessFallback(hdi0) {
  return round1(clamp(35 + 68 * ((hdi0 ?? 0.6) - 0.4), 32, 82));
}

// Resolve gci0 for a country given its iso3 + HDI.
export function resolveCompetitiveness(iso3, hdi0) {
  const real = COMPETITIVENESS[iso3];
  return real != null ? real : competitivenessFallback(hdi0);
}
