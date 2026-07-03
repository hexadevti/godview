// Fase 1.5 (em miniatura): garante que o motor NÃO diverge nem produz NaN, e
// que a cadeia causal central tem o sinal certo. Roda com `npm run test`.

import { describe, it, expect } from "vitest";
import { initialWorld, tick, SCENARIOS } from "./engine";

describe("estabilidade do motor", () => {
  it("não diverge nem gera NaN em 5000 ticks (todos os cenários)", () => {
    for (const scn of SCENARIOS) {
      let w = initialWorld(scn);
      for (let i = 0; i < 5000; i++) w = tick(w);
      for (const c of w.countries) {
        expect(Number.isFinite(c.gdp), `${scn.id}/${c.name} gdp`).toBe(true);
        expect(c.gdp).toBeGreaterThan(0);
        expect(Number.isFinite(c.fx)).toBe(true);
        expect(Number.isFinite(c.inflationAnn)).toBe(true);
        expect(Number.isFinite(c.gdpGrowthAnn)).toBe(true);
        expect(c.inflationAnn).toBeGreaterThanOrEqual(-5.01);
        expect(c.inflationAnn).toBeLessThanOrEqual(80.01);
        expect(c.gdpGrowthAnn).toBeGreaterThanOrEqual(-12.01);
        expect(c.gdpGrowthAnn).toBeLessThanOrEqual(14.01);
        expect(c.fx).toBeGreaterThanOrEqual(39.99);
        expect(c.fx).toBeLessThanOrEqual(220.01);
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
