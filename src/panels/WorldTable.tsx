// World overview table — every G20 country at a glance, plus GDP-weighted
// global aggregates, for a general sense of the state of the world. Sortable
// columns; clicking a row opens that country's inspector card.

import { useState } from "react";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";
import { formatPop, gdpPerCapita, gdpPerCapitaValue } from "./CountryPanel";
import { HelpTip, PROVENANCE, type HelpId } from "./HelpTip";
import { useDraggable } from "./useDraggable";

type Key =
  | "name" | "gdp" | "gdpGrowthAnn" | "inflationAnn" | "policyRate" | "fx" | "tradeBalancePctGdp"
  | "unemployment" | "debtPctGdp" | "gini" | "approval" | "population" | "gdpPerCapita";

const COLS: Array<{ key: Key; label: string; num: boolean; help?: HelpId }> = [
  { key: "name", label: "País", num: false },
  { key: "gdp", label: "PIB (tri)", num: true, help: "gdp" },
  { key: "population", label: "Pop.", num: true, help: "population" },
  { key: "gdpPerCapita", label: "PIB/cap.", num: true, help: "gdpPerCapita" },
  { key: "gdpGrowthAnn", label: "Cresc.", num: true, help: "growth" },
  { key: "inflationAnn", label: "Infl.", num: true, help: "inflation" },
  { key: "unemployment", label: "Desemp.", num: true, help: "unemployment" },
  { key: "policyRate", label: "Juros", num: true, help: "rate" },
  { key: "debtPctGdp", label: "Dívida", num: true, help: "debt" },
  { key: "gini", label: "Gini", num: true, help: "gini" },
  { key: "tradeBalancePctGdp", label: "Saldo", num: true, help: "trade" },
  { key: "approval", label: "Aprov.", num: true, help: "approval" },
];

function val(c: CountryState, k: Key): number | string {
  if (k === "name") return c.name;
  if (k === "policyRate") return c.controls.policyRate;
  if (k === "gdpPerCapita") return gdpPerCapitaValue(c.gdp, c.population);
  return c[k];
}

function growthColor(v: number) {
  return v < 0 ? "text-rose-400" : v > 3 ? "text-emerald-400" : "text-slate-200";
}
function inflColor(v: number) {
  return v > 6 ? "text-rose-400" : v > 4 ? "text-amber-300" : "text-slate-200";
}
function unempColor(v: number) {
  return v > 10 ? "text-rose-400" : v > 7 ? "text-amber-300" : "text-slate-200";
}
function approvalColor(v: number) {
  return v < 25 ? "text-rose-400" : v < 45 ? "text-amber-300" : "text-emerald-400";
}

export function WorldTable({ onClose, scope }: { onClose: () => void; scope: Set<number> }) {
  const { world, selectedIsos, openCountry } = useSim();
  const [sortKey, setSortKey] = useState<Key>("gdp");
  const [asc, setAsc] = useState(false);
  const { pos, dragging, onPointerDown } = useDraggable(16, 112);

  // Only the in-scope countries (G7 / Emergentes / G20 / Todos).
  const scoped = world.countries.filter((c) => scope.has(c.iso));
  const rows = [...scoped].sort((a, b) => {
    const va = val(a, sortKey);
    const vb = val(b, sortKey);
    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
    return asc ? cmp : -cmp;
  });

  // GDP-weighted aggregates over the active scope.
  const totalGdp = scoped.reduce((s, c) => s + c.gdp, 0) || 1;
  const wInfl = scoped.reduce((s, c) => s + c.inflationAnn * c.gdp, 0) / totalGdp;
  const wGrowth = scoped.reduce((s, c) => s + c.gdpGrowthAnn * c.gdp, 0) / totalGdp;
  const wUnemp = scoped.reduce((s, c) => s + c.unemployment * c.gdp, 0) / totalGdp;
  const wDebt = scoped.reduce((s, c) => s + c.debtPctGdp * c.gdp, 0) / totalGdp;
  const totalPop = scoped.reduce((s, c) => s + c.population, 0);
  const inRecession = scoped.filter((c) => c.gdpGrowthAnn < 0).length;
  const inCrisis = scoped.filter((c) => c.inCrisis).length;

  const clickHeader = (k: Key) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(k === "name");
    }
  };

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="gv-scroll pointer-events-auto fixed z-40 max-h-[calc(100vh-9rem)] w-[960px] max-w-[calc(100vw-2rem)] overflow-auto rounded-2xl border border-slate-700/60 bg-[#0a0f1c]/55 p-4 shadow-2xl backdrop-blur-lg"
    >
      <div
        onPointerDown={onPointerDown}
        className={`mb-3 flex items-start justify-between ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div>
          <h2 className="text-base font-bold text-white">Visão geral do mundo</h2>
          <p className="text-[11px] text-slate-400">{rows.length} países · Semana {world.tick} · arraste o título para mover · clique numa linha</p>
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
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">PIB total<HelpTip id="gdpTotal" /></div>
          <div title={PROVENANCE.gdpTotal} className="text-sm font-semibold text-slate-100">${totalGdp.toFixed(1)} tri</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">População<HelpTip id="population" /></div>
          <div title={PROVENANCE.population} className="text-sm font-semibold text-slate-100">{formatPop(totalPop)}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">Cresc. méd.<HelpTip id="growthAvg" /></div>
          <div title={PROVENANCE.growthAvg} className={`text-sm font-semibold ${growthColor(wGrowth)}`}>{wGrowth.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">Inflação méd.<HelpTip id="inflAvg" /></div>
          <div title={PROVENANCE.inflAvg} className={`text-sm font-semibold ${inflColor(wInfl)}`}>{wInfl.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">Desemp. méd.<HelpTip id="unemployment" /></div>
          <div title={PROVENANCE.unemployment} className={`text-sm font-semibold ${unempColor(wUnemp)}`}>{wUnemp.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">Dívida méd.<HelpTip id="debt" /></div>
          <div title={PROVENANCE.debt} className="text-sm font-semibold text-slate-100">{wDebt.toFixed(0)}% PIB</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">Em recessão<HelpTip id="recession" /></div>
          <div title={PROVENANCE.recession} className="text-sm font-semibold text-slate-100">{inRecession}/{scoped.length}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">Em crise<HelpTip id="approval" /></div>
          <div title={PROVENANCE.approval} className={`text-sm font-semibold ${inCrisis > 0 ? "text-rose-400" : "text-slate-100"}`}>{inCrisis}/{scoped.length}</div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-slate-400">
            {COLS.map((col) => (
              <th
                key={col.key}
                className={`select-none border-b border-slate-800 py-1.5 font-medium ${
                  col.num ? "text-right" : "text-left"
                }`}
              >
                <span className={`inline-flex items-center ${col.num ? "justify-end" : ""}`}>
                  <button onClick={() => clickHeader(col.key)} className="cursor-pointer hover:text-slate-200">
                    {col.label}
                    {sortKey === col.key ? (asc ? " ▲" : " ▼") : ""}
                  </button>
                  {col.help && <HelpTip id={col.help} />}
                </span>
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
                <td className="py-1.5 text-left font-medium text-slate-100">
                  {c.inCrisis && <span title="Em crise" className="mr-1">⚠</span>}
                  {c.name}
                </td>
                <td title={PROVENANCE.gdp} className="py-1.5 text-right tabular-nums text-slate-200">{c.gdp.toFixed(2)}</td>
                <td title={PROVENANCE.population} className="py-1.5 text-right tabular-nums text-slate-300">{formatPop(c.population)}</td>
                <td title={PROVENANCE.gdpPerCapita} className="py-1.5 text-right tabular-nums text-slate-200">{gdpPerCapita(c.gdp, c.population)}</td>
                <td title={PROVENANCE.growth} className={`py-1.5 text-right tabular-nums ${growthColor(c.gdpGrowthAnn)}`}>{c.gdpGrowthAnn.toFixed(1)}%</td>
                <td title={PROVENANCE.inflation} className={`py-1.5 text-right tabular-nums ${inflColor(c.inflationAnn)}`}>{c.inflationAnn.toFixed(1)}%</td>
                <td title={PROVENANCE.unemployment} className={`py-1.5 text-right tabular-nums ${unempColor(c.unemployment)}`}>{c.unemployment.toFixed(1)}%</td>
                <td title={PROVENANCE.rate} className="py-1.5 text-right tabular-nums text-slate-200">{c.controls.policyRate.toFixed(2)}%</td>
                <td title={PROVENANCE.debt} className="py-1.5 text-right tabular-nums text-slate-200">{c.debtPctGdp.toFixed(0)}%</td>
                <td title={PROVENANCE.gini} className="py-1.5 text-right tabular-nums text-slate-200">{c.gini.toFixed(0)}</td>
                <td title={PROVENANCE.trade} className={`py-1.5 text-right tabular-nums ${c.tradeBalancePctGdp < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {c.tradeBalancePctGdp.toFixed(1)}%
                </td>
                <td title={PROVENANCE.approval} className={`py-1.5 text-right tabular-nums font-semibold ${approvalColor(c.approval)}`}>{c.approval.toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
