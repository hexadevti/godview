// Fase 1.5 (em miniatura): garante que o motor NÃO diverge nem produz NaN, e
// que a cadeia causal central tem o sinal certo. Roda com `npm run test`.

import { describe, it, expect } from "vitest";
import { initialWorld, tick, SCENARIOS } from "./engine";

describe("estabilidade do motor", () => {
  it("não diverge nem gera NaN em 5000 ticks (todos os cenários)", () => {
    for (const scn of SCENARIOS) {
      let w = initialWorld(scn);
      for (let i = 0; i < 5000; i++) w = tick(w);
      expect(Number.isFinite(w.commodityPrice), `${scn.id} commodity`).toBe(true);
      for (const c of w.countries) {
        const tag = `${scn.id}/${c.name}`;
        expect(Number.isFinite(c.gdp), `${tag} gdp`).toBe(true);
        expect(c.gdp).toBeGreaterThan(0);
        expect(Number.isFinite(c.fx)).toBe(true);
        expect(Number.isFinite(c.inflationAnn)).toBe(true);
        expect(Number.isFinite(c.gdpGrowthAnn)).toBe(true);
        expect(c.inflationAnn).toBeGreaterThanOrEqual(-10.01);
        expect(c.inflationAnn).toBeLessThanOrEqual(300.01);
        expect(c.gdpGrowthAnn).toBeGreaterThanOrEqual(-12.01);
        expect(c.gdpGrowthAnn).toBeLessThanOrEqual(14.01);
        expect(c.fx).toBeGreaterThanOrEqual(39.99);
        expect(c.fx).toBeLessThanOrEqual(220.01);
        // ---- Social / fiscal / demographic bounds ----
        expect(c.unemployment, `${tag} unemployment`).toBeGreaterThanOrEqual(0.49);
        expect(c.unemployment).toBeLessThanOrEqual(45.01);
        expect(c.debtPctGdp, `${tag} debt`).toBeGreaterThanOrEqual(-0.01);
        expect(c.debtPctGdp).toBeLessThanOrEqual(400.01);
        expect(c.gini).toBeGreaterThanOrEqual(19.99);
        expect(c.gini).toBeLessThanOrEqual(70.01);
        expect(c.povertyPct).toBeGreaterThanOrEqual(-0.01);
        expect(c.povertyPct).toBeLessThanOrEqual(85.01);
        expect(c.approval, `${tag} approval`).toBeGreaterThanOrEqual(-0.01);
        expect(c.approval).toBeLessThanOrEqual(100.01);
        expect(c.education, `${tag} education`).toBeGreaterThanOrEqual(4.99);
        expect(c.education).toBeLessThanOrEqual(100.01);
        expect(c.unrest).toBeGreaterThanOrEqual(-0.01);
        expect(c.unrest).toBeLessThanOrEqual(100.01);
        expect(c.sovereignSpread).toBeGreaterThanOrEqual(-0.01);
        expect(c.sovereignSpread).toBeLessThanOrEqual(40.01);
        expect(Number.isFinite(c.fiscalBalancePctGdp)).toBe(true);
        expect(Number.isFinite(c.wellbeing)).toBe(true);
        expect(c.population).toBeGreaterThan(0);
        expect(typeof c.inCrisis).toBe("boolean");
      }
    }
  });
});

describe("cadeia causal", () => {
  it("subir juros aprecia o câmbio e esfria crescimento e inflação", () => {
    const BR = 76; // Brazil
    const base = initialWorld(SCENARIOS[0]);
    const hiked = initialWorld(SCENARIOS[0]);
    hiked.countries.find((c) => c.iso === BR)!.controls.policyRate = 20; // hike from 10.5

    let wb = base;
    let wh = hiked;
    for (let i = 0; i < 40; i++) {
      wb = tick(wb);
      wh = tick(wh);
    }

    const b = wb.countries.find((c) => c.iso === BR)!;
    const h = wh.countries.find((c) => c.iso === BR)!;

    expect(h.fx).toBeGreaterThan(b.fx); // moeda mais forte
    expect(h.gdpGrowthAnn).toBeLessThan(b.gdpGrowthAnn); // crescimento esfria
    expect(h.inflationAnn).toBeLessThan(b.inflationAnn); // inflação cede
  });
});

describe("cadeia causal social", () => {
  it("subir juros esfria a economia e eleva o desemprego (Okun)", () => {
    const BR = 76;
    const base = initialWorld(SCENARIOS[0]);
    const hiked = initialWorld(SCENARIOS[0]);
    hiked.countries.find((c) => c.iso === BR)!.controls.policyRate = 22; // hike

    let wb = base;
    let wh = hiked;
    for (let i = 0; i < 120; i++) {
      wb = tick(wb);
      wh = tick(wh);
    }
    const b = wb.countries.find((c) => c.iso === BR)!;
    const h = wh.countries.find((c) => c.iso === BR)!;
    expect(h.unemployment).toBeGreaterThan(b.unemployment); // desemprego sobe
  });

  it("aumentar impostos abruptamente corrói a aprovação pública", () => {
    const MX = 484; // Mexico (baseline tax ~17% GDP)
    const base = initialWorld(SCENARIOS[0]);
    const taxed = initialWorld(SCENARIOS[0]);
    taxed.countries.find((c) => c.iso === MX)!.controls.taxRate = 45; // sharp hike

    let wb = base;
    let wt = taxed;
    for (let i = 0; i < 120; i++) {
      wb = tick(wb);
      wt = tick(wt);
    }
    const b = wb.countries.find((c) => c.iso === MX)!;
    const t = wt.countries.find((c) => c.iso === MX)!;
    expect(t.approval).toBeLessThan(b.approval); // aprovação cai
    expect(t.fiscalBalancePctGdp).toBeGreaterThan(b.fiscalBalancePctGdp); // mas o fiscal melhora
  });

  it("choque de commodities acelera a inflação de um importador", () => {
    const JP = 392; // Japan, big energy importer
    const base = initialWorld(SCENARIOS[0]);
    const shocked = initialWorld(SCENARIOS[0]);
    shocked.commodityPrice = 160; // +60% oil shock

    let wb = base;
    let ws = shocked;
    for (let i = 0; i < 30; i++) {
      wb = tick(wb);
      ws = tick(ws);
    }
    const b = wb.countries.find((c) => c.iso === JP)!;
    const s = ws.countries.find((c) => c.iso === JP)!;
    expect(s.inflationAnn).toBeGreaterThan(b.inflationAnn); // inflação sobe
  });
});
