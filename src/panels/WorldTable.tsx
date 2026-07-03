// World overview table — every G20 country at a glance, plus GDP-weighted
// global aggregates, for a general sense of the state of the world. Sortable
// columns; clicking a row opens that country's inspector card.

import { useState } from "react";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";

type Key = "name" | "gdp" | "gdpGrowthAnn" | "inflationAnn" | "policyRate" | "fx" | "tradeBalancePctGdp";

const COLS: Array<{ key: Key; label: string; num: boolean }> = [
  { key: "name", label: "País", num: false },
  { key: "gdp", label: "PIB (tri)", num: true },
  { key: "gdpGrowthAnn", label: "Cresc.", num: true },
  { key: "inflationAnn", label: "Infl.", num: true },
  { key: "policyRate", label: "Juros", num: true },
  { key: "fx", label: "Câmbio", num: true },
  { key: "tradeBalancePctGdp", label: "Saldo", num: true },
];

function val(c: CountryState, k: Key): number | string {
  if (k === "name") return c.name;
  if (k === "policyRate") return c.controls.policyRate;
  return c[k];
}

function growthColor(v: number) {
  return v < 0 ? "text-rose-400" : v > 3 ? "text-emerald-400" : "text-slate-200";
}
function inflColor(v: number) {
  return v > 6 ? "text-rose-400" : v > 4 ? "text-amber-300" : "text-slate-200";
}

export function WorldTable({ onClose, scope }: { onClose: () => void; scope: Set<number> }) {
  const { world, selectedIsos, openCountry } = useSim();
  const [sortKey, setSortKey] = useState<Key>("gdp");
  const [asc, setAsc] = useState(false);

  const rows = world.countries
    .filter((c) => scope.has(c.iso))
    .sort((a, b) => {
    const va = val(a, sortKey);
    const vb = val(b, sortKey);
    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return asc ? cmp : -cmp;
  });

  // GDP-weighted global aggregates.
  const totalGdp = world.countries.reduce((s, c) => s + c.gdp, 0);
  const wInfl = world.countries.reduce((s, c) => s + c.inflationAnn * c.gdp, 0) / totalGdp;
  const wGrowth = world.countries.reduce((s, c) => s + c.gdpGrowthAnn * c.gdp, 0) / totalGdp;
  const inRecession = world.countries.filter((c) => c.gdpGrowthAnn < 0).length;

  const clickHeader = (k: Key) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(k === "name");
    }
  };

  return (
    <div className="gv-scroll pointer-events-auto absolute left-4 top-28 z-40 max-h-[calc(100vh-9rem)] w-[560px] max-w-[calc(100vw-2rem)] overflow-auto rounded-2xl border border-slate-800 bg-[#0a0f1c]/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Visão geral do mundo — G20</h2>
          <p className="text-[11px] text-slate-400">Semana {world.tick} · clique numa linha para abrir o país</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Global aggregates */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">PIB total</div>
          <div className="text-sm font-semibold text-slate-100">${totalGdp.toFixed(1)} tri</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Inflação méd.</div>
          <div className={`text-sm font-semibold ${inflColor(wInfl)}`}>{wInfl.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Cresc. méd.</div>
          <div className={`text-sm font-semibold ${growthColor(wGrowth)}`}>{wGrowth.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Em recessão</div>
          <div className="text-sm font-semibold text-slate-100">{inRecession}/{world.countries.length}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-slate-400">
            {COLS.map((col) => (
              <th
                key={col.key}
                onClick={() => clickHeader(col.key)}
                className={`cursor-pointer select-none border-b border-slate-800 py-1.5 font-medium hover:text-slate-200 ${
                  col.num ? "text-right" : "text-left"
                }`}
              >
                {col.label}
                {sortKey === col.key ? (asc ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const selected = selectedIsos.includes(c.iso);
            return (
              <tr
                key={c.iso}
                onClick={() => openCountry(c.iso)}
                className={`cursor-pointer border-b border-slate-800/50 hover:bg-slate-800/50 ${
                  selected ? "bg-sky-500/10" : ""
                }`}
              >
                <td className="py-1.5 text-left font-medium text-slate-100">{c.name}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-200">{c.gdp.toFixed(2)}</td>
                <td className={`py-1.5 text-right tabular-nums ${growthColor(c.gdpGrowthAnn)}`}>{c.gdpGrowthAnn.toFixed(1)}%</td>
                <td className={`py-1.5 text-right tabular-nums ${inflColor(c.inflationAnn)}`}>{c.inflationAnn.toFixed(1)}%</td>
                <td className="py-1.5 text-right tabular-nums text-slate-200">{c.controls.policyRate.toFixed(2)}%</td>
                <td className="py-1.5 text-right tabular-nums text-slate-200">{c.fx.toFixed(0)}</td>
                <td className={`py-1.5 text-right tabular-nums ${c.tradeBalancePctGdp < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {c.tradeBalancePctGdp.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
