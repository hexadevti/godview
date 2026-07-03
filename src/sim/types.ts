// Core domain types for the GodView simulation prototype.
//
// NOTE: this is a *stylized, educational* model — directionally sensible, not
// predictive. See plan §4 ("de cadeia causal para rede de influência") and the
// Fase 1.5 calibration risk. The prototype engine implements a small, damped
// subset of the full influence matrix just to make the click→adjust→propagate
// loop feel real.

/** User-controllable levers exposed in the country panel. */
export interface CountryControls {
  /** Central-bank policy rate, % per year (e.g. Selic, Fed Funds). */
  policyRate: number;
  /** Average import tariff, % (0 = free trade). */
  tariff: number;
  /** Government spending stance, index 0..100 (50 = neutral). */
  govSpending: number;
}

/** Structural constants for a country — fixed for a given scenario snapshot. */
export interface CountryConst {
  iso: number; // ISO 3166-1 numeric
  name: string;
  lat: number;
  lng: number;
  gdp0: number; // initial nominal GDP, trillions USD
  potentialGrowth: number; // long-run real growth, % per year
  neutralRate: number; // neutral policy rate, %
  inflTarget: number; // inflation anchor, % per year
  exportShare: number; // exports as share of GDP (0..1)
  importShare: number; // imports as share of GDP (0..1)
}

/** Mutable per-country state advanced each tick. */
export interface CountryState {
  iso: number;
  name: string;
  gdp: number; // level, trillions USD
  gdpGrowthAnn: number; // annualized real growth, %
  inflationAnn: number; // annualized inflation, %
  fx: number; // currency-strength index, 100 = baseline (higher = stronger)
  tradeBalancePctGdp: number; // net exports as % of GDP
  controls: CountryControls;
}

/** Full world state at one tick. */
export interface WorldState {
  tick: number; // 1 tick = 1 simulated week
  countries: CountryState[];
}

/** A starting point for a match — sandbox ("today") or a historical scenario. */
export interface ScenarioSnapshot {
  id: string;
  label: string;
  note: string;
  /** Initial control values per ISO (falls back to per-country defaults). */
  controls?: Record<number, Partial<CountryControls>>;
  /** Points added to every country's starting inflation (historical shocks). */
  inflationBias?: number;
}

// ---- Messages exchanged with the simulation Web Worker ----

export type ToWorker =
  | { type: "init"; scenarioId: string }
  | { type: "play" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "setSpeed"; speed: number }
  | { type: "setControl"; iso: number; field: keyof CountryControls; value: number };

export type FromWorker =
  | { type: "state"; world: WorldState; running: boolean }
  | { type: "status"; running: boolean; speed: number };
