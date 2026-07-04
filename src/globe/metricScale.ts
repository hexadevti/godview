// Single source of truth for the country choropleth color scales, so the globe
// and the on-screen legend always agree. Each scale maps a value -> t in [0,1]
// -> a color lerped between `lo` and `hi`. `ticks` are the values shown on the
// legend (positioned at t(value), which is why the GDP log scale still lines up).

import type { CountryState } from "../sim/types";

export type Metric =
  | "gdp" | "growth" | "inflation" | "unemployment" | "inequality" | "approval"
  | "gdpPerCapita" | "population";

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
  approval: {
    label: "Aprovação — índice 0–100",
    lo: "#ef4444",
    hi: "#22c55e",
    value: (c) => c.approval,
    t: (v) => clamp01(v / 100),
    ticks: [0, 25, 50, 75, 100],
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
};

export function metricColor(metric: Metric, c: CountryState): string {
  const s = METRIC_SCALES[metric];
  return lerpColor(s.lo, s.hi, s.t(s.value(c)));
}
