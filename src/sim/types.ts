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
  /** Average tax burden, % of GDP (higher = more revenue, cools demand). */
  taxRate: number;
  /** Share of spending directed to redistribution, 0..100 (50 = neutral). */
  socialSpendShare: number;
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
  // ---- Social / fiscal / demographic anchors (Fase 1) ----
  unemployment0: number; // current unemployment, %
  nairu: number; // natural (non-accelerating) rate of unemployment, %
  debt0: number; // gross public debt, % of GDP
  gini0: number; // income inequality, Gini index (0..100)
  poverty0: number; // poverty headcount, % of population
  population0: number; // population, millions
  popGrowth: number; // population growth, % per year
  dependencyRatio: number; // age dependency ratio, %
  taxBaseline: number; // baseline tax burden, % of GDP (neutral tax lever)
  approval0: number; // starting public approval, 0..100
  commodityExporter: number; // net commodity exposure, -1 (importer) .. +1 (exporter)
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
  // ---- Social / fiscal / demographic state (evolves each tick) ----
  unemployment: number; // %
  debtPctGdp: number; // gross public debt, % of GDP
  gini: number; // inequality, Gini index (0..100)
  povertyPct: number; // poverty headcount, %
  approval: number; // public approval / political capital, 0..100 (the game score)
  population: number; // millions
  // ---- Derived each tick (kept on state for charts + display) ----
  fiscalBalancePctGdp: number; // budget balance, % of GDP (negative = deficit)
  sovereignSpread: number; // risk premium added to borrowing cost, p.p.
  unrest: number; // social unrest / instability, 0..100
  wellbeing: number; // composite wellbeing index, 0..100
  inCrisis: boolean; // sustained collapse of approval / spike in unrest
  crisisTimer: number; // consecutive ticks past the crisis threshold (internal)
  controls: CountryControls;
}

/** Full world state at one tick. */
export interface WorldState {
  tick: number; // 1 tick = 1 simulated week
  commodityPrice: number; // global commodity/energy price index, 100 = baseline
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
  /** Starting global commodity/energy price index (default 100). */
  commodityPrice?: number;
  /** Optional game objective shown to the player (campaign framing). */
  objective?: string;
}

// ---- Messages exchanged with the simulation Web Worker ----

export type ToWorker =
  | { type: "init"; scenarioId: string }
  | { type: "play" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "setSpeed"; speed: number }
  | { type: "setControl"; iso: number; field: keyof CountryControls; value: number }
  | { type: "setCommodity"; value: number };

export type FromWorker =
  | { type: "state"; world: WorldState; running: boolean }
  | { type: "status"; running: boolean; speed: number };
