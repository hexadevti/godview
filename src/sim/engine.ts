// Prototype simulation engine — a small, DAMPED subset of the "everything
// influences everything" model from plan §4. Each variable moves a fraction of
// the way toward a target that reads the current state of all countries. The
// damping factors + clamps make it a contraction toward bounded equilibria, so
// it converges instead of exploding (the Fase 1.5 concern, in miniature).
//
// Demonstrable causal chain (drives the verification script):
//   ↑ policyRate → fx appreciates → exports fall → GDP growth cools → inflation cools.

import { G20 } from "../data/g20";
import type {
  CountryControls,
  CountryState,
  ScenarioSnapshot,
  WorldState,
} from "./types";

// ---- Model coefficients (hand-tuned for stability + sensible signs) ----
const DAMP_FX = 0.12;
const DAMP_G = 0.08;
const DAMP_I = 0.06;

const WEEKS_PER_YEAR = 52;

// Clamp ranges keep the system bounded no matter what levers the user sets.
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const SCENARIOS: ScenarioSnapshot[] = [
  {
    id: "sandbox",
    label: "Sandbox (hoje)",
    note: "Snapshot atual do G20. Experimente livremente — sem gabarito.",
  },
  {
    id: "trade-war",
    label: "Guerra comercial",
    note: "EUA e China começam com tarifas de 25%. Veja o efeito no comércio e no PIB.",
    controls: {
      840: { tariff: 25 }, // US
      156: { tariff: 25 }, // China
    },
  },
  {
    id: "inflation-shock",
    label: "Choque inflacionário",
    note: "Todos começam com +5 p.p. de inflação. Você consegue ancorar sem quebrar o PIB?",
    inflationBias: 5,
  },
];

export function defaultControls(rate0: number): CountryControls {
  return { policyRate: rate0, tariff: 2, govSpending: 50 };
}

/** Build the initial world for a scenario. */
export function initialWorld(scenario: ScenarioSnapshot): WorldState {
  const countries: CountryState[] = G20.map((d) => {
    const controls = defaultControls(d.rate0);
    const override = scenario.controls?.[d.iso];
    if (override) Object.assign(controls, override);
    return {
      iso: d.iso,
      name: d.name,
      gdp: d.gdp0,
      gdpGrowthAnn: d.potentialGrowth,
      inflationAnn: d.infl0 + (scenario.inflationBias ?? 0),
      fx: 100,
      tradeBalancePctGdp: 100 * (d.exportShare - d.importShare),
      controls,
    };
  });
  return { tick: 0, countries };
}

/** Advance the world by one tick (1 simulated week). Returns a new WorldState. */
export function tick(world: WorldState): WorldState {
  const cs = world.countries;
  const n = cs.length;

  // Global aggregates other countries react to (simple means; Fase 1 makes
  // these trade-weighted).
  let sumRate = 0;
  let sumInfl = 0;
  let sumGrowth = 0;
  for (const c of cs) {
    sumRate += c.controls.policyRate;
    sumInfl += c.inflationAnn;
    sumGrowth += c.gdpGrowthAnn;
  }
  const foreignAvgRate = sumRate / n;
  const foreignAvgInfl = sumInfl / n;
  const foreignAvgGrowth = sumGrowth / n;

  const next: CountryState[] = cs.map((c) => {
    const d = G20.find((g) => g.iso === c.iso)!;
    const { policyRate, tariff, govSpending } = c.controls;

    // --- FX: rate & inflation differentials + trade balance ---
    const fxTarget =
      100 +
      3 * (policyRate - foreignAvgRate) -
      2 * (c.inflationAnn - foreignAvgInfl) +
      0.4 * c.tradeBalancePctGdp;
    const fx = clamp(c.fx + DAMP_FX * (fxTarget - c.fx), 40, 220);

    // --- Trade: competitiveness (weaker fx = more exports), partner demand,
    //     domestic demand, tariffs on imports ---
    const competitiveness = 100 / fx;
    const exports = d.gdp0 * d.exportShare * competitiveness * (1 + 0.03 * foreignAvgGrowth);
    const imports = (d.gdp0 * d.importShare * (c.gdp / d.gdp0)) / (1 + 0.02 * tariff);
    const tradeBalancePctGdp = clamp((100 * (exports - imports)) / c.gdp, -20, 20);

    // --- Growth: monetary gap, fiscal stance, net exports, tariff drag ---
    const growthTarget =
      d.potentialGrowth -
      0.25 * (policyRate - d.neutralRate) +
      0.05 * (govSpending - 50) +
      0.35 * tradeBalancePctGdp -
      0.02 * tariff;
    const gdpGrowthAnn = clamp(c.gdpGrowthAnn + DAMP_G * (growthTarget - c.gdpGrowthAnn), -12, 14);

    // --- Inflation: Phillips (output gap), imported inflation via fx, tariffs,
    //     monetary tightening, mean-revert to target ---
    const outputGap = gdpGrowthAnn - d.potentialGrowth;
    const inflTargetDyn =
      d.inflTarget +
      0.25 * outputGap -
      0.2 * (policyRate - d.neutralRate) +
      0.04 * (100 - fx) +
      0.02 * tariff;
    const inflationAnn = clamp(c.inflationAnn + DAMP_I * (inflTargetDyn - c.inflationAnn), -5, 80);

    // GDP level compounds weekly at the current annualized growth rate.
    const gdp = c.gdp * (1 + gdpGrowthAnn / 100 / WEEKS_PER_YEAR);

    return {
      ...c,
      gdp,
      gdpGrowthAnn,
      inflationAnn,
      fx,
      tradeBalancePctGdp,
    };
  });

  return { tick: world.tick + 1, countries: next };
}
