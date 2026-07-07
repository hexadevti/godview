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
const DAMP_UNREST = 0.08; // unrest
const DAMP_SPREAD = 0.2; // sovereign risk premium (fast)
const DAMP_EDU = 0.01; // education quality (glacial — years/decades)
const DAMP_GCI = 0.01; // competitiveness (glacial — structural)
const DAMP_HDI = 0.01; // human development (glacial — structural)
const DAMP_COL = 0.05; // cost of living (medium — tracks prices/fx)
const DAMP_INST = 0.008; // institutional indices: CPI, democracy, press (glacial)
const DAMP_EFREE = 0.01; // economic freedom (glacial — structural)
const DAMP_SPI = 0.04; // social progress (medium — an outcome composite)
const DAMP_HAPPY = 0.05; // happiness (medium — an outcome composite)

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
    objective: "Trazer a inflação para perto da meta sem estourar o desemprego nem derrubar o bem-estar.",
  },
  {
    id: "stagflation",
    label: "Estagflação",
    note: "Inflação alta E economia parada. O dilema clássico: apertar juros aprofunda o desemprego.",
    inflationBias: 7,
    objective: "Sair da estagflação mantendo o bem-estar alto — cuidado com a instabilidade social.",
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
  return {
    policyRate: rate0,
    tariff: 2,
    govSpending: 50,
    taxRate: taxBaseline,
    socialSpendShare: 50,
    infraInvest: 50,
    subsidies: 50,
    healthInvest: 50,
    institutions: 50,
    marketFreedom: 50,
  };
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
      population: d.population0,
      education: d.education0,
      hdi: d.hdi0,
      costOfLiving: d.costOfLiving0,
      gci: d.gci0,
      econFreedom: d.econFreedom0,
      cpi: d.cpi0,
      democracy: d.democracy0,
      pressFreedom: d.pressFreedom0,
      spi: d.spi0,
      happiness: d.happiness0,
      fiscalBalancePctGdp: 0,
      sovereignSpread: 0,
      unrest: 0,
      wellbeing: 0,
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
    const {
      policyRate, tariff, govSpending, taxRate, socialSpendShare,
      infraInvest, subsidies, healthInvest, institutions, marketFreedom,
    } = c.controls;

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
      0.03 * Math.max(0, c.unrest - 50) +
      0.02 * (c.education - d.education0) + // human capital: schooling above baseline lifts productivity
      0.03 * (infraInvest - 50) + // infrastructure & innovation lift productive capacity
      0.02 * (c.gci - d.gci0) + // a more competitive economy grows a bit faster
      0.02 * (marketFreedom - 50) + // deregulation / market liberalization lifts activity
      0.015 * (c.cpi - d.cpi0); // less corruption / better institutions aid investment
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
      0.02 * tariff -
      0.04 * (subsidies - 50); // price subsidies cap measured inflation (energy/food/transport)
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
      0.05 * (infraInvest - 50) - // capital spending on infrastructure/innovation
      0.06 * (subsidies - 50) - // subsidies are a direct fiscal cost
      0.05 * (healthInvest - 50) - // health & wellbeing spending
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
        0.15 * (gdpGrowthAnn - d.potentialGrowth) +
        0.04 * (marketFreedom - 50), // deregulation widens inequality (efficiency vs. equity)
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

    // --- Education quality: rises with schooling investment (social + gov
    //     spending), eroded by sustained unrest; drifts very slowly (years).
    //     Computed before the structural indices below, which read it. ---
    const eduTarget = clamp(
      d.education0 + 0.15 * (socialSpendShare - 50) + 0.08 * (govSpending - 50) - 0.1 * Math.max(0, c.unrest - 50),
      5,
      100,
    );
    const education = clamp(c.education + DAMP_EDU * (eduTarget - c.education), 5, 100);

    // --- Global Competitiveness (GCI): infrastructure & innovation investment
    //     and human capital lift it; instability, high inflation and heavy market
    //     distortions (over-subsidy) erode it. Structural → moves glacially. ---
    const gciTarget = clamp(
      d.gci0 +
        0.12 * (infraInvest - 50) +
        0.05 * (education - d.education0) -
        0.04 * Math.max(0, c.unrest - 40) -
        0.03 * Math.max(0, inflationAnn - 10) -
        0.02 * Math.max(0, subsidies - 70),
      25,
      92,
    );
    const gci = clamp(c.gci + DAMP_GCI * (gciTarget - c.gci), 25, 92);

    // --- Cost of Living index: a stronger currency makes the country pricier in
    //     common (NY=100) terms, sustained inflation raises local prices, and
    //     subsidies ease it. Reverts to the baseline in the neutral state. ---
    const colTarget = clamp(
      d.costOfLiving0 * (0.5 + 0.5 * (fx / 100)) +
        0.3 * Math.max(0, inflationAnn - d.inflTarget) -
        0.15 * (subsidies - 50),
      10,
      200,
    );
    const costOfLiving = clamp(c.costOfLiving + DAMP_COL * (colTarget - c.costOfLiving), 10, 200);

    // --- Human Development Index (HDI): a composite of health (health lever),
    //     education (schooling) and income (GDP per capita vs. baseline), dragged
    //     by sustained unrest. Structural → moves glacially. ---
    const perCap = c.population > 0 ? (c.gdp * 1e6) / c.population : 0;
    const basePerCap = d.population0 > 0 ? (d.gdp0 * 1e6) / d.population0 : 0;
    const incomeGain = clamp(0.15 * Math.log10((perCap + 1) / (basePerCap + 1)), -0.1, 0.1);
    const hdiTarget = clamp(
      d.hdi0 +
        0.0025 * (education - d.education0) +
        0.0015 * (healthInvest - 50) +
        incomeGain -
        0.0008 * Math.max(0, c.unrest - 50),
      0.2,
      0.99,
    );
    const hdi = clamp(c.hdi + DAMP_HDI * (hdiTarget - c.hdi), 0.2, 0.99);

    // === Governance & wellbeing indices (all start at their real anchor) ======

    // --- Economic Freedom: market liberalization + strong institutions raise it;
    //     runaway inflation (macro instability) erodes it. Structural → glacial. ---
    const efreeTarget = clamp(
      d.econFreedom0 + 0.10 * (marketFreedom - 50) + 0.05 * (institutions - 50) - 0.03 * Math.max(0, inflationAnn - 10),
      15,
      95,
    );
    const econFreedom = clamp(c.econFreedom + DAMP_EFREE * (efreeTarget - c.econFreedom), 15, 95);

    // --- Corruption Perceptions (higher = cleaner): institutional reform lifts
    //     it; sustained unrest (state capture / breakdown) erodes it. Glacial. ---
    const cpiTarget = clamp(d.cpi0 + 0.15 * (institutions - 50) - 0.05 * Math.max(0, c.unrest - 40), 5, 95);
    const cpi = clamp(c.cpi + DAMP_INST * (cpiTarget - c.cpi), 5, 95);

    // --- Democracy Index (0..10): rises with institutional quality; erodes with
    //     instability and crisis (backsliding). Glacial. ---
    const demTarget = clamp(
      d.democracy0 + 0.02 * (institutions - 50) - 0.01 * Math.max(0, c.unrest - 50),
      0,
      10,
    );
    const democracy = clamp(c.democracy + DAMP_INST * (demTarget - c.democracy), 0, 10);

    // --- Press Freedom (higher = freer): tracks institutions & democratic
    //     openness; repression during unrest lowers it. Glacial. ---
    const pressTarget = clamp(
      d.pressFreedom0 + 0.12 * (institutions - 50) + 2 * (democracy - d.democracy0) - 0.06 * Math.max(0, c.unrest - 45),
      10,
      95,
    );
    const pressFreedom = clamp(c.pressFreedom + DAMP_INST * (pressTarget - c.pressFreedom), 10, 95);

    // --- Social Progress Index: an OUTCOME composite of human development, low
    //     poverty & inequality, education and rights. Centered on its anchor. ---
    const spiTarget = clamp(
      d.spi0 +
        60 * (hdi - d.hdi0) -
        0.3 * (povertyPct - d.poverty0) -
        0.2 * (gini - d.gini0) +
        0.08 * (education - d.education0) +
        0.05 * (pressFreedom - d.pressFreedom0),
      25,
      97,
    );
    const spi = clamp(c.spi + DAMP_SPI * (spiTarget - c.spi), 25, 97);

    // --- Happiness (WHR life ladder 0..10): the report regresses it on income,
    //     health, freedom, corruption and social stability — modeled here as a
    //     composite centered on the country's anchor. ---
    const happyTarget = clamp(
      d.happiness0 +
        2.5 * (hdi - d.hdi0) + // income + health + education
        0.6 * clamp(Math.log10((perCap + 1) / (basePerCap + 1)), -0.4, 0.4) - // real income swings
        0.05 * (unemployment - d.nairu) -
        0.03 * Math.max(0, inflationAnn - d.inflTarget) -
        0.04 * Math.max(0, costOfLiving - d.costOfLiving0) +
        0.012 * (cpi - d.cpi0) + // less corruption
        0.05 * (democracy - d.democracy0) - // freedom
        0.02 * Math.max(0, c.unrest - 40),
      2,
      8,
    );
    const happiness = clamp(c.happiness + DAMP_HAPPY * (happyTarget - c.happiness), 2, 8);

    // --- Social unrest: high misery (inflation+unemployment) and high inequality
    //     feed it; it drags growth, weakens the currency and erodes institutions. ---
    const misery = inflationAnn + unemployment;
    const unrestTarget = clamp(
      0.6 * Math.max(0, misery - 12) + 0.4 * Math.max(0, gini - 45),
      0,
      100,
    );
    const unrest = clamp(c.unrest + DAMP_UNREST * (unrestTarget - c.unrest), 0, 100);

    // --- Composite wellbeing index (display): lifted by human development,
    //     eroded by poverty, inequality, unemployment, inflation and an
    //     unaffordable cost of living. ---
    const wellbeing = clamp(
      100 -
        0.5 * povertyPct -
        0.4 * (gini - 25) -
        0.3 * unemployment -
        0.2 * Math.max(0, inflationAnn) +
        20 * (hdi - 0.7) -
        0.1 * Math.max(0, costOfLiving - 60),
      0,
      100,
    );

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
      population,
      education,
      gci,
      hdi,
      costOfLiving,
      econFreedom,
      cpi,
      democracy,
      pressFreedom,
      spi,
      happiness,
      fiscalBalancePctGdp,
      sovereignSpread,
      unrest,
      wellbeing,
    };
  });

  return { tick: world.tick + 1, commodityPrice, countries: next };
}
