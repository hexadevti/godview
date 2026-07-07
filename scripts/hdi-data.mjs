// Human Development Index (IDH/HDI) reference table — UNDP Human Development
// Report 2023/24 (2022 reference year), keyed by ISO 3166-1 alpha-3 code.
// Range 0..1 (higher = better). HDI is a composite of life expectancy, schooling
// and GNI per capita; UNDP publishes it — the World Bank API does not — so it is
// curated here rather than fetched. Shared by scripts/ingest.mjs (canonical
// pipeline) and scripts/patch-hdi.mjs (adds hdi0 to an existing snapshot).

export const HDI = {
  USA: 0.927, CHN: 0.788, DEU: 0.950, JPN: 0.920, GBR: 0.940, IND: 0.644,
  FRA: 0.910, RUS: 0.821, ITA: 0.906, CAN: 0.935, BRA: 0.760, ESP: 0.911,
  KOR: 0.929, MEX: 0.781, AUS: 0.946, TUR: 0.855, IDN: 0.713, NLD: 0.946,
  SAU: 0.875, CHE: 0.967, POL: 0.881, BEL: 0.942, IRL: 0.950, ARG: 0.849,
  SWE: 0.952, ISR: 0.915, AUT: 0.926, THA: 0.803, ARE: 0.937, NOR: 0.966,
  VNM: 0.726, PHL: 0.710, MYS: 0.807, DNK: 0.952, COL: 0.758, BGD: 0.670,
  ROU: 0.827, ZAF: 0.717, PAK: 0.540, CZE: 0.895, EGY: 0.728, IRN: 0.780,
  CHL: 0.860, PRT: 0.874, PER: 0.762, FIN: 0.942, KAZ: 0.802, NGA: 0.548,
  DZA: 0.745, GRC: 0.893, NZL: 0.939, IRQ: 0.673, HUN: 0.851, QAT: 0.855,
  UKR: 0.734, MAR: 0.698, KWT: 0.847, SVK: 0.855, UZB: 0.727, KEN: 0.601,
  BGR: 0.799, ECU: 0.765, DOM: 0.766, ETH: 0.492, GTM: 0.629, AGO: 0.591,
  GHA: 0.602, OMN: 0.819, LKA: 0.780, CUB: 0.764, HRV: 0.878, CRI: 0.806,
  LUX: 0.927, CIV: 0.550, SRB: 0.805, VEN: 0.699, LTU: 0.879, BLR: 0.801,
  COD: 0.481, PAN: 0.820, TZA: 0.532, URY: 0.830, MMR: 0.608, SVN: 0.926,
  AZE: 0.760, BOL: 0.698, JOR: 0.736, UGA: 0.550, SDN: 0.516, CMR: 0.587,
  TUN: 0.732, KHM: 0.600, ZWE: 0.550, TKM: 0.744, LVA: 0.879, PRY: 0.756,
  LBY: 0.746, EST: 0.899, NPL: 0.601, CYP: 0.907, HND: 0.624, ISL: 0.959,
  GEO: 0.814, SEN: 0.517, SLV: 0.674, BIH: 0.803, HTI: 0.552, PNG: 0.568,
  ALB: 0.789, MLI: 0.410, ARM: 0.786, ZMB: 0.569, BFA: 0.438, GIN: 0.471,
  GUY: 0.742, LBN: 0.723, TTO: 0.814, BEN: 0.504, MNG: 0.741, SYR: 0.557,
  JAM: 0.706, KGZ: 0.701, MOZ: 0.461, NER: 0.394, NIC: 0.674, YEM: 0.424,
  GAB: 0.693, TCD: 0.394, BWA: 0.708, MDA: 0.763, MDG: 0.487, MKD: 0.765,
  AFG: 0.462, LAO: 0.620, TJK: 0.679, BHS: 0.820, COG: 0.593, RWA: 0.548,
  BRN: 0.823, MWI: 0.508, NAM: 0.610, GNQ: 0.650, SOM: 0.380, MRT: 0.540,
  SSD: 0.381, TGO: 0.547, MNE: 0.844, SLE: 0.458, FJI: 0.729, DJI: 0.515,
  LBR: 0.487, SUR: 0.722, SWZ: 0.610, BTN: 0.681, BDI: 0.420, BLZ: 0.700,
  CAF: 0.387, GMB: 0.495, GNB: 0.483, LSO: 0.521, ERI: 0.493, SLB: 0.562,
  TLS: 0.566, VUT: 0.614,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Fallback for any country missing from the UNDP table: estimate HDI from the
// education index (0..100) and GDP per capita (USD), which together track two of
// HDI's three dimensions. Deliberately coarse — only reached for uncurated gaps.
export function hdiFallback(education0, perCapUsd) {
  const eduPart = clamp((education0 ?? 50) / 100, 0, 1);
  const incPart = perCapUsd
    ? clamp((Math.log10(clamp(perCapUsd, 300, 80000)) - 2.5) / 2.4, 0, 1)
    : 0.5;
  return Math.round((0.25 + 0.7 * (0.5 * eduPart + 0.5 * incPart)) * 1000) / 1000;
}

// Resolve hdi0 for a country given its iso3 + already-derived anchors.
export function resolveHdi(iso3, education0, perCapUsd) {
  const real = HDI[iso3];
  return real != null ? real : hdiFallback(education0, perCapUsd);
}
