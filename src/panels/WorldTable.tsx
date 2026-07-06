// World overview table — every G20 country at a glance, plus GDP-weighted
// global aggregates, for a general sense of the state of the world. Sortable
// columns; clicking a row opens that country's inspector card.

import { useState } from "react";
import { useI18n } from "../i18n/i18n";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";
import { formatPop, gdpPerCapita, gdpPerCapitaValue } from "./CountryPanel";
import { HelpTip, PROVENANCE, type HelpId } from "./HelpTip";
import { useDraggable } from "./useDraggable";

type Key =
  | "name" | "gdp" | "gdpGrowthAnn" | "inflationAnn" | "policyRate" | "fx" | "tradeBalancePctGdp"
  | "unemployment" | "debtPctGdp" | "gini" | "approval" | "population" | "gdpPerCapita" | "education";

// Column labels are resolved at render via t(`col.${key}`).
const COLS: Array<{ key: Key; num: boolean; help?: HelpId }> = [
  { key: "name", num: false },
  { key: "gdp", num: true, help: "gdp" },
  { key: "population", num: true, help: "population" },
  { key: "gdpPerCapita", num: true, help: "gdpPerCapita" },
  { key: "gdpGrowthAnn", num: true, help: "growth" },
  { key: "inflationAnn", num: true, help: "inflation" },
  { key: "unemployment", num: true, help: "unemployment" },
  { key: "policyRate", num: true, help: "rate" },
  { key: "debtPctGdp", num: true, help: "debt" },
  { key: "gini", num: true, help: "gini" },
  { key: "education", num: true, help: "education" },
  { key: "tradeBalancePctGdp", num: true, help: "trade" },
  { key: "approval", num: true, help: "approval" },
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
  const { t, lang } = useI18n();
  const P = PROVENANCE[lang];
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
          <h2 className="text-base font-bold text-white">{t("wt.title")}</h2>
          <p className="text-[11px] text-slate-400">{t("wt.subtitle", { n: rows.length, w: world.tick })}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title={t("common.close")}
        >
          ✕
        </button>
      </div>

      {/* Global aggregates */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.gdpTotal")}<HelpTip id="gdpTotal" /></div>
          <div title={P.gdpTotal} className="text-sm font-semibold text-slate-100">${totalGdp.toFixed(1)} {t("unit.tri")}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.population")}<HelpTip id="population" /></div>
          <div title={P.population} className="text-sm font-semibold text-slate-100">{formatPop(totalPop)}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.growthAvg")}<HelpTip id="growthAvg" /></div>
          <div title={P.growthAvg} className={`text-sm font-semibold ${growthColor(wGrowth)}`}>{wGrowth.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.inflAvg")}<HelpTip id="inflAvg" /></div>
          <div title={P.inflAvg} className={`text-sm font-semibold ${inflColor(wInfl)}`}>{wInfl.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.unempAvg")}<HelpTip id="unemployment" /></div>
          <div title={P.unemployment} className={`text-sm font-semibold ${unempColor(wUnemp)}`}>{wUnemp.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.debtAvg")}<HelpTip id="debt" /></div>
          <div title={P.debt} className="text-sm font-semibold text-slate-100">{wDebt.toFixed(0)}% {t("unit.gdp")}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.recession")}<HelpTip id="recession" /></div>
          <div title={P.recession} className="text-sm font-semibold text-slate-100">{inRecession}/{scoped.length}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">{t("agg.crisis")}<HelpTip id="approval" /></div>
          <div title={P.approval} className={`text-sm font-semibold ${inCrisis > 0 ? "text-rose-400" : "text-slate-100"}`}>{inCrisis}/{scoped.length}</div>
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
                    {t(`col.${col.key}`)}
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
                  {c.inCrisis && <span title={t("common.inCrisis")} className="mr-1">⚠</span>}
                  {c.name}
                </td>
                <td title={P.gdp} className="py-1.5 text-right tabular-nums text-slate-200">{c.gdp.toFixed(2)}</td>
                <td title={P.population} className="py-1.5 text-right tabular-nums text-slate-300">{formatPop(c.population)}</td>
                <td title={P.gdpPerCapita} className="py-1.5 text-right tabular-nums text-slate-200">{gdpPerCapita(c.gdp, c.population)}</td>
                <td title={P.growth} className={`py-1.5 text-right tabular-nums ${growthColor(c.gdpGrowthAnn)}`}>{c.gdpGrowthAnn.toFixed(1)}%</td>
                <td title={P.inflation} className={`py-1.5 text-right tabular-nums ${inflColor(c.inflationAnn)}`}>{c.inflationAnn.toFixed(1)}%</td>
                <td title={P.unemployment} className={`py-1.5 text-right tabular-nums ${unempColor(c.unemployment)}`}>{c.unemployment.toFixed(1)}%</td>
                <td title={P.rate} className="py-1.5 text-right tabular-nums text-slate-200">{c.controls.policyRate.toFixed(2)}%</td>
                <td title={P.debt} className="py-1.5 text-right tabular-nums text-slate-200">{c.debtPctGdp.toFixed(0)}%</td>
                <td title={P.gini} className="py-1.5 text-right tabular-nums text-slate-200">{c.gini.toFixed(0)}</td>
                <td title={P.education} className="py-1.5 text-right tabular-nums text-slate-200">{c.education.toFixed(0)}</td>
                <td title={P.trade} className={`py-1.5 text-right tabular-nums ${c.tradeBalancePctGdp < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {c.tradeBalancePctGdp.toFixed(1)}%
                </td>
                <td title={P.approval} className={`py-1.5 text-right tabular-nums font-semibold ${approvalColor(c.approval)}`}>{c.approval.toFixed(0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
