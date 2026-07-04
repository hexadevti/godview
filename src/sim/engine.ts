// Prototype simulation engine — a small, DAMPED subset of the "everything
// influences everything" model from plan §4. Each variable moves a fraction of
// the way toward a target that reads the current state of all countries. The
// damping factors + clamps make it a contraction toward bounded equilibria, so
// it converges instead of exploding (the Fase 1.5 concern, in miniature).
//
// Demonstrable causal chain (drives the verification script):
//   ↑ policyRate → fx appreciates → exports fall → GDP growth cools → inflation cools.

import { G20, G20_BY_ISO } from "../data/g20";
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
// Social/fiscal blocks move at their own pace: opinion and inequality are slow,
// unemployment is medium, the risk spread reacts fast. Everything is clamped, so
// the loops saturate at bounds instead of diverging (Fase 1.5).
const DAMP_U = 0.1; // unemployment
const DAMP_GINI = 0.03; // inequality (very slow)
const DAMP_POV = 0.05; // poverty
const DAMP_APPROVAL = 0.04; // approval (opinion changes slowly)
const DAMP_UNREST = 0.08; // unrest
const DAMP_SPREAD = 0.2; // sovereign risk premium (fast)

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
    objective: "Trazer a inflação para perto da meta sem estourar o desemprego nem derrubar a aprovação.",
  },
  {
    id: "stagflation",
    label: "Estagflação",
    note: "Inflação alta E economia parada. O dilema clássico: apertar juros aprofunda o desemprego.",
    inflationBias: 7,
    objective: "Sair da estagflação mantendo a aprovação acima de 30 — cuidado com a insatisfação social.",
  },
  {
    id: "oil-shock",
    label: "Choque do petróleo",
    note: "Preço global de commodities dispara (+60%). Importadores sofrem com inflação; exportadores lucram.",
    commodityPrice: 160,
    objective: "Conter o repasse inflacionário do choque de energia sem provocar recessão.",
  },
];

export function defaultControls(rate0: number, taxBaseline: number): CountryControls {
  return { policyRate: rate0, tariff: 2, govSpending: 50, taxRate: taxBaseline, socialSpendShare: 50 };
}

/** Build the initial world for a scenario. */
export function initialWorld(scenario: ScenarioSnapshot): WorldState {
  const countries: CountryState[] = G20.map((d) => {
    const controls = defaultControls(d.rate0, d.taxBaseline);
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
      unemployment: d.unemployment0,
      debtPctGdp: d.debt0,
      gini: d.gini0,
      povertyPct: d.poverty0,
      approval: d.approval0,
      population: d.population0,
      fiscalBalancePctGdp: 0,
      sovereignSpread: 0,
      unrest: 0,
      wellbeing: 0,
      inCrisis: false,
      crisisTimer: 0,
      controls,
    };
  });
  return { tick: 0, commodityPrice: scenario.commodityPrice ?? 100, countries };
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

  // Global commodity/energy price is exogenous (shocked via the worker) and
  // slowly reverts toward its 100 baseline so a shock fades over ~1 year.
  const commodityPrice = clamp(world.commodityPrice + 0.01 * (100 - world.commodityPrice), 40, 400);
  const commodityGap = (commodityPrice - 100) / 100; // fractional deviation from baseline

  const next: CountryState[] = cs.map((c) => {
    const d = G20_BY_ISO[c.iso]!;
    const { policyRate, tariff, govSpending, taxRate, socialSpendShare } = c.controls;

    // --- FX: rate & inflation differentials + trade balance, plus terms-of-trade
    //     from commodities and a capital-flight penalty when unrest is high ---
    const fxTarget =
      100 +
      3 * (policyRate - foreignAvgRate) -
      2 * (c.inflationAnn - foreignAvgInfl) +
      0.4 * c.tradeBalancePctGdp +
      15 * d.commodityExporter * commodityGap -
      0.5 * Math.max(0, c.unrest - 60);
    const fx = clamp(c.fx + DAMP_FX * (fxTarget - c.fx), 40, 220);

    // --- Trade: competitiveness (weaker fx = more exports), partner demand,
    //     domestic demand, tariffs on imports, commodity terms of trade ---
    const competitiveness = 100 / fx;
    const exports = d.gdp0 * d.exportShare * competitiveness * (1 + 0.03 * foreignAvgGrowth);
    const imports = (d.gdp0 * d.importShare * (c.gdp / d.gdp0)) / (1 + 0.02 * tariff);
    const tradeBalancePctGdp = clamp(
      (100 * (exports - imports)) / c.gdp + 3 * d.commodityExporter * commodityGap,
      -20,
      20,
    );

    // --- Growth: monetary gap, fiscal stance, net exports, tariff drag, plus
    //     tax drag, the sovereign risk spread, and an unrest drag on investment ---
    const growthTarget =
      d.potentialGrowth -
      0.25 * (policyRate - d.neutralRate) +
      0.05 * (govSpending - 50) +
      0.35 * tradeBalancePctGdp -
      0.02 * tariff -
      0.03 * (taxRate - d.taxBaseline) -
      0.1 * c.sovereignSpread -
      0.03 * Math.max(0, c.unrest - 50);
    const gdpGrowthAnn = clamp(c.gdpGrowthAnn + DAMP_G * (growthTarget - c.gdpGrowthAnn), -12, 14);

    // --- Unemployment (Okun's law): growth above potential pulls unemployment
    //     below its natural rate; taxes and unrest dampen hiring ---
    const uTarget =
      d.nairu -
      0.4 * (gdpGrowthAnn - d.potentialGrowth) +
      0.03 * (taxRate - d.taxBaseline) +
      0.04 * Math.max(0, c.unrest - 40);
    const unemployment = clamp(c.unemployment + DAMP_U * (uTarget - c.unemployment), 0.5, 45);

    // --- Inflation: Phillips via BOTH output gap and unemployment gap, imported
    //     inflation via fx, tariffs, commodity pass-through, monetary tightening ---
    const outputGap = gdpGrowthAnn - d.potentialGrowth;
    const inflTargetDyn =
      d.inflTarget +
      0.25 * outputGap -
      0.15 * (unemployment - d.nairu) +
      4 * commodityGap -
      0.2 * (policyRate - d.neutralRate) +
      0.04 * (100 - fx) +
      0.02 * tariff;
    // Wide upper bound so real hyperinflation (e.g. Argentina ~220%) is
    // representable and mean-reverts smoothly instead of snapping to a cap.
    const inflationAnn = clamp(c.inflationAnn + DAMP_I * (inflTargetDyn - c.inflationAnn), -10, 300);

    // --- Sovereign risk spread: debt, inflation, weak currency and unrest raise
    //     the premium on top of the policy rate (uses last tick's debt/unrest) ---
    const spreadTarget = clamp(
      0.03 * Math.max(0, c.debtPctGdp - 60) +
        0.15 * Math.max(0, c.inflationAnn - d.inflTarget) +
        0.01 * Math.max(0, 100 - fx) +
        0.05 * Math.max(0, c.unrest - 50),
      0,
      40,
    );
    const sovereignSpread = clamp(c.sovereignSpread + DAMP_SPREAD * (spreadTarget - c.sovereignSpread), 0, 40);

    // --- Fiscal balance & public debt dynamics ---
    const agingPressure = 0.02 * Math.max(0, d.dependencyRatio - 50);
    const primaryBalance =
      0.4 * (taxRate - d.taxBaseline) -
      0.08 * (govSpending - 50) -
      0.02 * (socialSpendShare - 50) -
      agingPressure;
    const interestBurden = ((policyRate + sovereignSpread) * c.debtPctGdp) / 100;
    const fiscalBalancePctGdp = clamp(primaryBalance - interestBurden, -25, 15);
    // Debt/GDP: deficit adds, nominal growth erodes the ratio (annual → weekly).
    const nominalGrowth = gdpGrowthAnn + inflationAnn;
    const debtChange = (-fiscalBalancePctGdp - (nominalGrowth / 100) * c.debtPctGdp) / WEEKS_PER_YEAR;
    const debtPctGdp = clamp(c.debtPctGdp + debtChange, 0, 400);

    // --- Inequality (Gini): unemployment, austerity and inflation widen it;
    //     redistribution and above-potential growth narrow it ---
    const giniTarget = clamp(
      d.gini0 +
        0.3 * (unemployment - d.nairu) +
        0.1 * Math.max(0, inflationAnn - d.inflTarget) -
        0.08 * (socialSpendShare - 50) -
        0.15 * (gdpGrowthAnn - d.potentialGrowth),
      20,
      70,
    );
    const gini = clamp(c.gini + DAMP_GINI * (giniTarget - c.gini), 20, 70);

    // --- Poverty: driven by unemployment + inflation, relieved by growth and
    //     social spending ---
    const povTarget = clamp(
      d.poverty0 +
        0.6 * (unemployment - d.nairu) +
        0.2 * Math.max(0, inflationAnn - d.inflTarget) -
        0.5 * (gdpGrowthAnn - d.potentialGrowth) -
        0.06 * (socialSpendShare - 50),
      0,
      85,
    );
    const povertyPct = clamp(c.povertyPct + DAMP_POV * (povTarget - c.povertyPct), 0, 85);

    // --- Public approval (the game score): reward beating potential; punish
    //     inflation, unemployment, rising inequality, taxes and tariffs ---
    const misery = inflationAnn + unemployment;
    const approvalTarget = clamp(
      55 +
        2.5 * (gdpGrowthAnn - d.potentialGrowth) -
        1.2 * Math.max(0, inflationAnn - d.inflTarget) -
        1.0 * Math.max(0, unemployment - d.nairu) -
        0.4 * Math.max(0, gini - d.gini0) -
        0.3 * Math.max(0, taxRate - d.taxBaseline) -
        0.2 * tariff +
        0.15 * (socialSpendShare - 50),
      0,
      100,
    );
    const approval = clamp(c.approval + DAMP_APPROVAL * (approvalTarget - c.approval), 0, 100);

    // --- Social unrest: high misery, high inequality and low approval feed it ---
    const unrestTarget = clamp(
      0.6 * Math.max(0, misery - 12) + 0.4 * Math.max(0, gini - 45) + 0.5 * Math.max(0, 40 - approval),
      0,
      100,
    );
    const unrest = clamp(c.unrest + DAMP_UNREST * (unrestTarget - c.unrest), 0, 100);

    // --- Composite wellbeing index (display scoreboard) ---
    const wellbeing = clamp(
      100 - 0.5 * povertyPct - 0.4 * (gini - 25) - 0.3 * unemployment - 0.2 * Math.max(0, inflationAnn),
      0,
      100,
    );

    // --- Crisis: sustained collapse of approval or a spike in unrest ---
    const crisisTrigger = approval < 15 || unrest > 75;
    const crisisTimer = crisisTrigger ? c.crisisTimer + 1 : 0;
    const inCrisis = crisisTimer > 8;

    // GDP level compounds weekly at the current annualized growth rate.
    const gdp = c.gdp * (1 + gdpGrowthAnn / 100 / WEEKS_PER_YEAR);
    // Population drifts at its structural growth rate.
    const population = c.population * (1 + d.popGrowth / 100 / WEEKS_PER_YEAR);

    return {
      ...c,
      gdp,
      gdpGrowthAnn,
      inflationAnn,
      fx,
      tradeBalancePctGdp,
      unemployment,
      debtPctGdp,
      gini,
      povertyPct,
      approval,
      population,
      fiscalBalancePctGdp,
      sovereignSpread,
      unrest,
      wellbeing,
      inCrisis,
      crisisTimer,
    };
  });

  return { tick: world.tick + 1, commodityPrice, countries: next };
}
