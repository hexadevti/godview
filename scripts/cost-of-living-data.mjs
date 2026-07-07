// Cost of Living index reference table, keyed by ISO 3166-1 alpha-3 code.
// Numbeo-style index, excluding rent, with New York City = 100 (higher = more
// expensive). ~2024 values. This is an approximate, curated index (Numbeo does
// not publish a free bulk dataset and the World Bank API doesn't carry it), so
// it lives here rather than being fetched. Shared by scripts/ingest.mjs and
// scripts/patch-cost-of-living.mjs.

export const COST_OF_LIVING = {
  USA: 71, CHN: 40, DEU: 61, JPN: 42, GBR: 62, IND: 24, FRA: 62, RUS: 33,
  ITA: 59, CAN: 65, BRA: 34, ESP: 52, KOR: 58, MEX: 38, AUS: 70, TUR: 36,
  IDN: 33, NLD: 65, SAU: 46, CHE: 101, POL: 41, BEL: 65, IRL: 68, ARG: 35,
  SWE: 63, ISR: 76, AUT: 63, THA: 39, ARE: 56, NOR: 76, VNM: 33, PHL: 34,
  MYS: 33, DNK: 73, COL: 33, BGD: 33, ROU: 40, ZAF: 36, PAK: 22, CZE: 48,
  EGY: 27, IRN: 33, CHL: 47, PRT: 49, PER: 35, FIN: 67, KAZ: 32, NGA: 26,
  DZA: 32, GRC: 51, NZL: 68, IRQ: 40, HUN: 43, QAT: 58, UKR: 32, MAR: 36,
  KWT: 51, SVK: 47, UZB: 30, KEN: 36, BGR: 41, ECU: 42, DOM: 47, ETH: 33,
  GTM: 42, AGO: 40, GHA: 36, OMN: 47, LKA: 30, CUB: 45, HRV: 50, CRI: 52,
  LUX: 74, CIV: 40, SRB: 43, VEN: 40, LTU: 47, BLR: 34, COD: 42, PAN: 50,
  TZA: 33, URY: 52, MMR: 32, SVN: 55, AZE: 34, BOL: 34, JOR: 47, UGA: 34,
  SDN: 30, CMR: 36, TUN: 32, KHM: 36, ZWE: 40, TKM: 40, LVA: 48, PRY: 36,
  LBY: 33, EST: 55, NPL: 30, CYP: 55, HND: 42, ISL: 83, GEO: 36, SEN: 40,
  SLV: 45, BIH: 40, HTI: 45, PNG: 50, ALB: 41, MLI: 38, ARM: 41, ZMB: 33,
  BFA: 38, GIN: 38, GUY: 45, LBN: 55, TTO: 55, BEN: 38, MNG: 40, SYR: 40,
  JAM: 50, KGZ: 30, MOZ: 35, NER: 36, NIC: 42, YEM: 35, GAB: 50, TCD: 40,
  BWA: 38, MDA: 38, MDG: 33, MKD: 38, AFG: 30, LAO: 36, TJK: 32, BHS: 75,
  COG: 48, RWA: 38, BRN: 45, MWI: 33, NAM: 40, GNQ: 45, SOM: 35, MRT: 38,
  SSD: 45, TGO: 38, MNE: 47, SLE: 36, FJI: 50, DJI: 50, LBR: 40, SUR: 45,
  SWZ: 38, BTN: 40, BDI: 38, BLZ: 50, CAF: 42, GMB: 33, GNB: 38, LSO: 36,
  ERI: 40, SLB: 50, TLS: 42, VUT: 55,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Fallback for any country missing from the table: cost of living tracks income
// per capita closely, so derive it from GDP per capita (USD) on a log scale.
export function costOfLivingFallback(perCapUsd) {
  if (!perCapUsd) return 40;
  const v = 22 + 31 * (Math.log10(clamp(perCapUsd, 300, 90000)) - 2.7);
  return Math.round(clamp(v, 20, 100));
}

// Resolve costOfLiving0 for a country given its iso3 + GDP per capita.
export function resolveCostOfLiving(iso3, perCapUsd) {
  const real = COST_OF_LIVING[iso3];
  return real != null ? real : costOfLivingFallback(perCapUsd);
}
