// Single source of truth for the country choropleth color scales, so the globe
// and the on-screen legend always agree. Each scale maps a value -> t in [0,1]
// -> a color lerped between `lo` and `hi`. `ticks` are the values shown on the
// legend (positioned at t(value), which is why the GDP log scale still lines up).

import type { CountryState } from "../sim/types";

export type Metric =
  | "gdp" | "growth" | "inflation" | "unemployment" | "inequality"
  | "gdpPerCapita" | "population" | "education" | "hdi" | "costOfLiving" | "gci"
  | "econFreedom" | "cpi" | "democracy" | "pressFreedom" | "spi" | "happiness" | "homicide";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

export interface MetricScale {
  label: string;
  lo: string; // color at t=0
  hi: string; // color at t=1
  value: (c: CountryState) => number;
  t: (v: number) => number;
  ticks: number[];
  fmt: (v: number) => string;
}

const GDP_LO = Math.log10(0.3);
const GDP_HI = Math.log10(30);
const PC_LO = Math.log10(500);
const PC_HI = Math.log10(120000);
const POP_LO = Math.log10(1);
const POP_HI = Math.log10(1500);
/** GDP per capita in USD: GDP (tri USD) / population (millions) * 1e6. */
const perCapita = (c: CountryState) => (c.population > 0 ? (c.gdp * 1e6) / c.population : 0);

export const METRIC_SCALES: Record<Metric, MetricScale> = {
  gdp: {
    label: "PIB — tri USD (escala log)",
    lo: "#1e293b",
    hi: "#fbbf24",
    value: (c) => c.gdp,
    t: (v) => clamp01((Math.log10(v) - GDP_LO) / (GDP_HI - GDP_LO)),
    ticks: [0.3, 1, 3, 10, 30],
    fmt: (v) => `$${v}T`,
  },
  growth: {
    label: "Crescimento — % a.a.",
    lo: "#ef4444",
    hi: "#22c55e",
    value: (c) => c.gdpGrowthAnn,
    t: (v) => clamp01((v + 8) / 20),
    ticks: [-8, -4, 0, 4, 8, 12],
    fmt: (v) => `${v > 0 ? "+" : ""}${v}%`,
  },
  inflation: {
    label: "Inflação — % a.a.",
    lo: "#22c55e",
    hi: "#ef4444",
    value: (c) => c.inflationAnn,
    t: (v) => clamp01(v / 25),
    ticks: [0, 5, 10, 15, 20, 25],
    fmt: (v) => `${v}%`,
  },
  unemployment: {
    label: "Desemprego — % da força de trabalho",
    lo: "#22c55e",
    hi: "#ef4444",
    value: (c) => c.unemployment,
    t: (v) => clamp01(v / 30),
    ticks: [0, 6, 12, 18, 24, 30],
    fmt: (v) => `${v}%`,
  },
  inequality: {
    label: "Desigualdade — índice de Gini",
    lo: "#22c55e",
    hi: "#a21caf",
    value: (c) => c.gini,
    t: (v) => clamp01((v - 25) / 40),
    ticks: [25, 35, 45, 55, 65],
    fmt: (v) => `${v}`,
  },
  gdpPerCapita: {
    label: "PIB per capita — US$ (escala log)",
    lo: "#052e16",
    hi: "#4ade80",
    value: perCapita,
    t: (v) => clamp01((Math.log10(v) - PC_LO) / (PC_HI - PC_LO)),
    ticks: [500, 2000, 10000, 40000, 120000],
    fmt: (v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`),
  },
  population: {
    label: "População — milhões (escala log)",
    lo: "#1e293b",
    hi: "#60a5fa",
    value: (c) => c.population,
    t: (v) => clamp01((Math.log10(v) - POP_LO) / (POP_HI - POP_LO)),
    ticks: [1, 10, 100, 500, 1500],
    fmt: (v) => (v >= 1000 ? `${v / 1000} bi` : `${v} mi`),
  },
  education: {
    label: "Educação — índice 0–100",
    lo: "#7c2d12",
    hi: "#38bdf8",
    value: (c) => c.education,
    t: (v) => clamp01(v / 100),
    ticks: [0, 25, 50, 75, 100],
    fmt: (v) => `${v}`,
  },
  hdi: {
    label: "IDH — índice 0–1 (ONU)",
    lo: "#7f1d1d",
    hi: "#34d399",
    value: (c) => c.hdi,
    t: (v) => clamp01((v - 0.35) / 0.62),
    ticks: [0.4, 0.55, 0.7, 0.85, 1],
    fmt: (v) => v.toFixed(2),
  },
  costOfLiving: {
    label: "Custo de vida — índice (NY=100)",
    lo: "#134e4a",
    hi: "#fbbf24",
    value: (c) => c.costOfLiving,
    t: (v) => clamp01((v - 20) / 85),
    ticks: [25, 45, 65, 85, 105],
    fmt: (v) => `${v.toFixed(0)}`,
  },
  gci: {
    label: "Competitividade — índice 0–100 (FEM)",
    lo: "#1e1b4b",
    hi: "#818cf8",
    value: (c) => c.gci,
    t: (v) => clamp01((v - 30) / 55),
    ticks: [35, 50, 65, 80],
    fmt: (v) => `${v.toFixed(0)}`,
  },
  econFreedom: {
    label: "Liberdade econômica — índice 0–100",
    lo: "#7c2d12",
    hi: "#facc15",
    value: (c) => c.econFreedom,
    t: (v) => clamp01((v - 20) / 70),
    ticks: [30, 50, 70, 90],
    fmt: (v) => `${v.toFixed(0)}`,
  },
  cpi: {
    label: "Percepção da corrupção (IPC) — 0–100",
    lo: "#7f1d1d",
    hi: "#2dd4bf",
    value: (c) => c.cpi,
    t: (v) => clamp01(v / 100),
    ticks: [10, 30, 50, 70, 90],
    fmt: (v) => `${v.toFixed(0)}`,
  },
  democracy: {
    label: "Democracia — índice 0–10 (EIU)",
    lo: "#7f1d1d",
    hi: "#60a5fa",
    value: (c) => c.democracy,
    t: (v) => clamp01(v / 10),
    ticks: [2, 4, 6, 8, 10],
    fmt: (v) => v.toFixed(1),
  },
  pressFreedom: {
    label: "Liberdade de imprensa — 0–100 (RSF)",
    lo: "#7f1d1d",
    hi: "#38bdf8",
    value: (c) => c.pressFreedom,
    t: (v) => clamp01(v / 100),
    ticks: [20, 40, 60, 80],
    fmt: (v) => `${v.toFixed(0)}`,
  },
  spi: {
    label: "Progresso social (SPI) — 0–100",
    lo: "#3f1d38",
    hi: "#4ade80",
    value: (c) => c.spi,
    t: (v) => clamp01((v - 25) / 72),
    ticks: [30, 50, 70, 90],
    fmt: (v) => `${v.toFixed(0)}`,
  },
  happiness: {
    label: "Felicidade global — 0–10 (WHR)",
    lo: "#334155",
    hi: "#fbbf24",
    value: (c) => c.happiness,
    t: (v) => clamp01((v - 2) / 6),
    ticks: [3, 4, 5, 6, 7],
    fmt: (v) => v.toFixed(1),
  },
  homicide: {
    label: "Homicídios — por 100 mil hab.",
    lo: "#22c55e",
    hi: "#ef4444",
    value: (c) => c.homicide,
    t: (v) => clamp01(v / 40),
    ticks: [0, 10, 20, 30, 40],
    fmt: (v) => v.toFixed(1),
  },
};

export function metricColor(metric: Metric, c: CountryState): string {
  const s = METRIC_SCALES[metric];
  return lerpColor(s.lo, s.hi, s.t(s.value(c)));
}
