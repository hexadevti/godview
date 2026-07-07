// World overview table — every G20 country at a glance, plus GDP-weighted
// global aggregates, for a general sense of the state of the world. Sortable
// columns; clicking a row opens that country's inspector card.

import { useState } from "react";
import { countryName } from "../i18n/countryNames";
import { useI18n } from "../i18n/i18n";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";
import { formatPop, gdpPerCapita, gdpPerCapitaValue } from "./CountryPanel";
import { HelpTip, PROVENANCE, type HelpId } from "./HelpTip";
import { useDraggable, useResizable } from "./useDraggable";

type Key =
  | "name" | "gdp" | "gdpGrowthAnn" | "inflationAnn" | "policyRate" | "fx" | "tradeBalancePctGdp"
  | "unemployment" | "debtPctGdp" | "gini" | "population" | "gdpPerCapita" | "education" | "hdi" | "costOfLiving" | "gci"
  | "econFreedom" | "cpi" | "democracy" | "pressFreedom" | "spi" | "happiness";

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
  { key: "hdi", num: true, help: "hdi" },
  { key: "costOfLiving", num: true, help: "costOfLiving" },
  { key: "gci", num: true, help: "gci" },
  { key: "econFreedom", num: true, help: "econFreedom" },
  { key: "cpi", num: true, help: "cpi" },
  { key: "democracy", num: true, help: "democracy" },
  { key: "pressFreedom", num: true, help: "pressFreedom" },
  { key: "spi", num: true, help: "spi" },
  { key: "happiness", num: true, help: "happiness" },
  { key: "tradeBalancePctGdp", num: true, help: "trade" },
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

// Columns where a LOWER value is better — so ranking #1 goes to the lowest. All
// other numeric columns rank #1 = highest.
const LOWER_BETTER = new Set<Key>(["inflationAnn", "unemployment", "debtPctGdp", "gini", "costOfLiving"]);

// Formatted display string for a numeric cell (value mode).
function fmtCell(c: CountryState, k: Key, t: Parameters<typeof formatPop>[1]): string {
  switch (k) {
    case "gdp": return c.gdp.toFixed(2);
    case "population": return formatPop(c.population, t);
    case "gdpPerCapita": return gdpPerCapita(c.gdp, c.population);
    case "gdpGrowthAnn": return `${c.gdpGrowthAnn.toFixed(1)}%`;
    case "inflationAnn": return `${c.inflationAnn.toFixed(1)}%`;
    case "unemployment": return `${c.unemployment.toFixed(1)}%`;
    case "policyRate": return `${c.controls.policyRate.toFixed(2)}%`;
    case "debtPctGdp": return `${c.debtPctGdp.toFixed(0)}%`;
    case "gini": return c.gini.toFixed(0);
    case "education": return c.education.toFixed(0);
    case "hdi": return c.hdi.toFixed(3);
    case "costOfLiving": return c.costOfLiving.toFixed(0);
    case "gci": return c.gci.toFixed(1);
    case "econFreedom": return c.econFreedom.toFixed(0);
    case "cpi": return c.cpi.toFixed(0);
    case "democracy": return c.democracy.toFixed(1);
    case "pressFreedom": return c.pressFreedom.toFixed(0);
    case "spi": return c.spi.toFixed(0);
    case "happiness": return c.happiness.toFixed(1);
    case "tradeBalancePctGdp": return `${c.tradeBalancePctGdp.toFixed(1)}%`;
    default: return "";
  }
}

// Text color for a cell in value mode (conditional per metric).
function cellColor(c: CountryState, k: Key): string {
  switch (k) {
    case "gdpGrowthAnn": return growthColor(c.gdpGrowthAnn);
    case "inflationAnn": return inflColor(c.inflationAnn);
    case "unemployment": return unempColor(c.unemployment);
    case "tradeBalancePctGdp": return c.tradeBalancePctGdp < 0 ? "text-rose-400" : "text-emerald-400";
    case "population": return "text-slate-300";
    default: return "text-slate-200";
  }
}

// Text color for a cell in ranking mode: top third green, bottom third red.
function rankColor(rank: number, n: number): string {
  if (n < 3) return "text-slate-200";
  if (rank <= n / 3) return "text-emerald-400";
  if (rank > (2 * n) / 3) return "text-rose-400";
  return "text-slate-300";
}

export function WorldTable({ onClose, scope }: { onClose: () => void; scope: Set<number> }) {
  const { world, selectedIsos, openCountry } = useSim();
  const { t, lang } = useI18n();
  const P = PROVENANCE[lang];
  const [sortKey, setSortKey] = useState<Key>("gdp");
  const [asc, setAsc] = useState(false);
  // Toggle: show each country's rank/position per criterion instead of the raw
  // value, for a quick sense of where each country stands.
  const [showRank, setShowRank] = useState(false);
  // Wide by default (many columns) and opened at the top-left of the page.
  const W0 = Math.min(1280, window.innerWidth - 32);
  const H0 = Math.min(680, window.innerHeight - 120);
  const { pos, dragging, onPointerDown } = useDraggable(16, 16);
  const { size, onPointerDown: onResize } = useResizable(W0, H0, 1600);

  // Only the in-scope countries (G7 / Emergentes / G20 / Todos).
  const scoped = world.countries.filter((c) => scope.has(c.iso));
  const rows = [...scoped].sort((a, b) => {
    const va = sortKey === "name" ? countryName(a.iso, lang, a.name) : val(a, sortKey);
    const vb = sortKey === "name" ? countryName(b.iso, lang, b.name) : val(b, sortKey);
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
  const wWellbeing = scoped.reduce((s, c) => s + c.wellbeing * c.gdp, 0) / totalGdp;

  // Rank each country (1 = best) per numeric column, honoring each metric's
  // "better" direction. Recomputed each tick; cheap for ~160 countries.
  const n = scoped.length;
  const ranks: Partial<Record<Key, Record<number, number>>> = {};
  if (showRank) {
    for (const col of COLS) {
      if (!col.num) continue;
      const lower = LOWER_BETTER.has(col.key);
      const sorted = [...scoped].sort(
        (a, b) => (Number(val(a, col.key)) - Number(val(b, col.key))) * (lower ? 1 : -1),
      );
      const m: Record<number, number> = {};
      sorted.forEach((c, i) => (m[c.iso] = i + 1));
      ranks[col.key] = m;
    }
  }

  const clickHeader = (k: Key) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(k === "name");
    }
  };

  return (
    <div
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      className="pointer-events-auto fixed z-40 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0a0f1c]/55 shadow-2xl backdrop-blur-lg"
    >
      <div className="gv-scroll min-h-0 flex-1 overflow-auto p-4">
      <div
        onPointerDown={onPointerDown}
        className={`mb-3 flex items-start justify-between ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div>
          <h2 className="text-base font-bold text-white">{t("wt.title")}</h2>
          <p className="text-[0.6875rem] text-slate-400">{t("wt.subtitle", { n: rows.length, w: world.tick })}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-800/60 p-0.5 text-[0.6875rem] font-semibold" title={t("wt.rankHint")}>
            <button
              onClick={() => setShowRank(false)}
              className={`rounded-md px-2 py-1 ${!showRank ? "bg-slate-200 text-slate-900" : "text-slate-300 hover:text-white"}`}
            >
              {t("wt.values")}
            </button>
            <button
              onClick={() => setShowRank(true)}
              className={`rounded-md px-2 py-1 ${showRank ? "bg-slate-200 text-slate-900" : "text-slate-300 hover:text-white"}`}
            >
              {t("wt.ranking")}
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            title={t("common.close")}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Global aggregates */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("agg.gdpTotal")}<HelpTip id="gdpTotal" /></div>
          <div title={P.gdpTotal} className="text-sm font-semibold text-slate-100">${totalGdp.toFixed(1)} {t("unit.tri")}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("agg.population")}<HelpTip id="population" /></div>
          <div title={P.population} className="text-sm font-semibold text-slate-100">{formatPop(totalPop, t)}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("agg.growthAvg")}<HelpTip id="growthAvg" /></div>
          <div title={P.growthAvg} className={`text-sm font-semibold ${growthColor(wGrowth)}`}>{wGrowth.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("agg.inflAvg")}<HelpTip id="inflAvg" /></div>
          <div title={P.inflAvg} className={`text-sm font-semibold ${inflColor(wInfl)}`}>{wInfl.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("agg.unempAvg")}<HelpTip id="unemployment" /></div>
          <div title={P.unemployment} className={`text-sm font-semibold ${unempColor(wUnemp)}`}>{wUnemp.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("agg.debtAvg")}<HelpTip id="debt" /></div>
          <div title={P.debt} className="text-sm font-semibold text-slate-100">{wDebt.toFixed(0)}% {t("unit.gdp")}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("agg.recession")}<HelpTip id="recession" /></div>
          <div title={P.recession} className="text-sm font-semibold text-slate-100">{inRecession}/{scoped.length}</div>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <div className="flex items-center text-[0.625rem] uppercase tracking-wide text-slate-400">{t("cp.wellbeing")}<HelpTip id="wellbeing" /></div>
          <div title={P.wellbeing} className="text-sm font-semibold text-slate-100">{wWellbeing.toFixed(0)}/100</div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm [&_td]:whitespace-nowrap [&_td]:px-2.5 [&_th]:whitespace-nowrap [&_th]:px-2.5">
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
                {COLS.map((col) => {
                  if (col.key === "name") {
                    return (
                      <td key="name" className="py-1.5 text-left font-medium text-slate-100">
                        {countryName(c.iso, lang, c.name)}
                      </td>
                    );
                  }
                  const rank = ranks[col.key]?.[c.iso];
                  const content = showRank && rank != null ? `#${rank}` : fmtCell(c, col.key, t);
                  const color =
                    showRank && rank != null ? rankColor(rank, n) : cellColor(c, col.key);
                  return (
                    <td
                      key={col.key}
                      title={col.help ? P[col.help] : undefined}
                      className={`py-1.5 text-right tabular-nums ${color}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Resize handle (bottom-right corner) */}
      <div
        onPointerDown={onResize}
        title={t("common.resize")}
        className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-nwse-resize"
      >
        <div className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 border-b-2 border-r-2 border-slate-500" />
      </div>
    </div>
  );
}
