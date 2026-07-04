// Floating country inspector cards. One card per open country — clicking
// another country adds a card without closing the previous ones. Each card
// shows live stats, the adjustable levers, and time-series charts.

import * as Slider from "@radix-ui/react-slider";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSim } from "../state/store";
import type { CountryControls, CountryState } from "../sim/types";
import type { HistoryPoint } from "../state/store";
import { HelpTip, PROVENANCE, type HelpId } from "./HelpTip";
import { useDraggable, useResizable } from "./useDraggable";

function Stat({ label, value, help }: { label: string; value: string; help?: HelpId }) {
  return (
    <div className="rounded-lg bg-slate-800/60 px-3 py-2">
      <div className="flex items-center text-[10px] uppercase tracking-wide text-slate-400">
        {label}
        {help && <HelpTip id={help} />}
      </div>
      <div className="text-sm font-semibold text-slate-100" title={help ? PROVENANCE[help] : undefined}>
        {value}
      </div>
    </div>
  );
}

function Lever({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  help,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  help?: HelpId;
}) {
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="flex items-center text-sm text-slate-200">{label}{help && <HelpTip id={help} />}</span>
        <span className="text-sm font-semibold text-sky-300">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-slate-700">
          <Slider.Range className="absolute h-full rounded-full bg-sky-400" />
        </Slider.Track>
        <Slider.Thumb className="block h-4 w-4 rounded-full bg-white shadow ring-1 ring-sky-500/50 focus:outline-none" />
      </Slider.Root>
    </div>
  );
}

function MiniChart({
  data,
  lines,
  domain,
}: {
  data: HistoryPoint[];
  lines: Array<{ key: string; color: string; label: string }>;
  domain?: [number | "auto", number | "auto"];
}) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="tick" tick={{ fill: "#64748b", fontSize: 10 }} stroke="#334155" />
          <YAxis tick={{ fill: "#64748b", fontSize: 10 }} stroke="#334155" domain={domain} width={40} />
          <Tooltip
            contentStyle={{ background: "#0d1626", border: "1px solid #22314f", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <ReferenceLine y={0} stroke="#334155" />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
          {/* Scroll/zoom the time window to review the past */}
          <Brush dataKey="tick" height={13} stroke="#475569" fill="#0d1626" travellerWidth={8} tickFormatter={() => ""} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function approvalColor(v: number) {
  return v < 25 ? "#ef4444" : v < 45 ? "#f59e0b" : "#22c55e";
}

/** Population in millions -> "1.41 bi" / "212 mi". */
export function formatPop(millions: number): string {
  return millions >= 1000 ? `${(millions / 1000).toFixed(2)} bi` : `${millions.toFixed(1)} mi`;
}

/** GDP per capita in USD: GDP (tri USD) / population (millions) * 1e6. */
export function gdpPerCapitaValue(gdpTri: number, popMillions: number): number {
  return popMillions > 0 ? (gdpTri * 1e6) / popMillions : 0;
}

/** GDP per capita formatted, "$88.0k" / "$1.2k". */
export function gdpPerCapita(gdpTri: number, popMillions: number): string {
  const usd = gdpPerCapitaValue(gdpTri, popMillions);
  return usd >= 1000 ? `$${(usd / 1000).toFixed(1)}k` : `$${usd.toFixed(0)}`;
}

/** Prominent public-approval meter — the game score — with a crisis banner. */
function ApprovalGauge({ country }: { country: CountryState }) {
  const a = country.approval;
  const color = approvalColor(a);
  return (
    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center text-xs font-semibold uppercase tracking-wide text-slate-300">
          Aprovação pública<HelpTip id="approval" />
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color }} title={PROVENANCE.approval}>
          {a.toFixed(0)}/100
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full transition-all" style={{ width: `${a}%`, background: color }} />
      </div>
      {country.inCrisis ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-rose-500/15 px-2 py-1 text-[11px] font-semibold text-rose-300">
          ⚠ Crise política — fuga de capital e instabilidade. Recupere a aprovação!
        </div>
      ) : (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
          <span title={PROVENANCE.unrest} className="flex items-center">
            Instabilidade {country.unrest.toFixed(0)}<HelpTip id="unrest" />
          </span>
          <span title={PROVENANCE.wellbeing} className="flex items-center">
            Bem-estar {country.wellbeing.toFixed(0)}<HelpTip id="wellbeing" />
          </span>
        </div>
      )}
    </div>
  );
}

function CountryCard({
  country,
  drag,
  resize,
}: {
  country: CountryState;
  drag: ReturnType<typeof useDraggable>;
  resize: ReturnType<typeof useResizable>;
}) {
  const { history, closeCountry, setControl } = useSim();
  const hist = history[country.iso] ?? [];
  const change = (field: keyof CountryControls) => (v: number) => setControl(country.iso, field, v);
  const { pos, dragging, onPointerDown } = drag;
  const { size, onPointerDown: onResize } = resize;

  return (
    <div
      data-testid="country-card"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      className="pointer-events-auto fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0a0f1c]/30 shadow-2xl backdrop-blur-lg"
    >
      <div
        onPointerDown={onPointerDown}
        className={`flex flex-none items-start justify-between p-4 pb-2 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div>
          <h2 className="text-lg font-bold text-white">{country.name}</h2>
          <p className="text-[11px] text-slate-400">Arraste o título para mover · canto ↘ para redimensionar.</p>
        </div>
        <button
          onClick={() => closeCountry(country.iso)}
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Fechar"
        >
          ✕
        </button>
      </div>

      <div className="gv-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <ApprovalGauge country={country} />

      {/* Wide layout: stats (left) and levers (right) side by side */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Economia</div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="PIB" value={`$${country.gdp.toFixed(2)} tri`} help="gdp" />
              <Stat label="PIB per capita" value={gdpPerCapita(country.gdp, country.population)} help="gdpPerCapita" />
              <Stat label="Crescimento" value={`${country.gdpGrowthAnn.toFixed(1)}%`} help="growth" />
              <Stat label="Inflação" value={`${country.inflationAnn.toFixed(1)}%`} help="inflation" />
              <Stat label="População" value={formatPop(country.population)} help="population" />
              <Stat label="Câmbio (índice)" value={country.fx.toFixed(1)} help="fx" />
              <Stat label="Saldo comercial" value={`${country.tradeBalancePctGdp.toFixed(1)}% PIB`} help="trade" />
              <Stat label="Juros" value={`${country.controls.policyRate.toFixed(2)}%`} help="rate" />
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Social & fiscal</div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Desemprego" value={`${country.unemployment.toFixed(1)}%`} help="unemployment" />
              <Stat label="Dívida pública" value={`${country.debtPctGdp.toFixed(0)}% PIB`} help="debt" />
              <Stat label="Resultado fiscal" value={`${country.fiscalBalancePctGdp >= 0 ? "+" : ""}${country.fiscalBalancePctGdp.toFixed(1)}% PIB`} help="deficit" />
              <Stat label="Risco (spread)" value={`+${country.sovereignSpread.toFixed(1)} p.p.`} help="spread" />
              <Stat label="Desigualdade (Gini)" value={country.gini.toFixed(0)} help="gini" />
              <Stat label="Pobreza" value={`${country.povertyPct.toFixed(0)}%`} help="poverty" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Alavancas de política
          </div>
          <Lever label="Taxa de juros" unit="%" value={country.controls.policyRate} min={0} max={50} step={0.25} onChange={change("policyRate")} help="rate" />
          <Lever label="Tarifa de importação" unit="%" value={country.controls.tariff} min={0} max={40} step={1} onChange={change("tariff")} help="tariff" />
          <Lever label="Gasto público" unit="" value={country.controls.govSpending} min={0} max={100} step={1} onChange={change("govSpending")} help="gov" />
          <Lever label="Carga tributária" unit="%" value={country.controls.taxRate} min={0} max={60} step={1} onChange={change("taxRate")} help="tax" />
          <Lever label="Gasto social" unit="" value={country.controls.socialSpendShare} min={0} max={100} step={1} onChange={change("socialSpendShare")} help="social" />
        </div>
      </div>

      {/* Charts in a 2-column grid so the window stays short */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-300">
            Inflação (<span className="text-rose-400">━</span>) e Crescimento (<span className="text-emerald-400">━</span>) — % a.a.
          </div>
          <MiniChart
            data={hist}
            lines={[
              { key: "inflation", color: "#fb7185", label: "Inflação" },
              { key: "growth", color: "#34d399", label: "Crescimento" },
            ]}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-300">
            Desemprego (<span className="text-amber-400">━</span>) e Aprovação (<span className="text-sky-400">━</span>)
          </div>
          <MiniChart
            data={hist}
            lines={[
              { key: "unemployment", color: "#fbbf24", label: "Desemprego" },
              { key: "approval", color: "#38bdf8", label: "Aprovação" },
            ]}
            domain={[0, 100]}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-300">
            Dívida pública — % do PIB
          </div>
          <MiniChart data={hist} lines={[{ key: "debt", color: "#c084fc", label: "Dívida" }]} domain={["auto", "auto"]} />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-300">
            Câmbio — índice (100 = base; ↑ = moeda mais forte)
          </div>
          <MiniChart data={hist} lines={[{ key: "fx", color: "#38bdf8", label: "Câmbio" }]} domain={["auto", "auto"]} />
        </div>
      </div>
      </div>

      {/* Resize handle (bottom-right corner) */}
      <div
        onPointerDown={onResize}
        title="Redimensionar"
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize"
      >
        <div className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 border-b-2 border-r-2 border-slate-500" />
      </div>
    </div>
  );
}

export function CountryCards() {
  const { world, selectedIsos } = useSim();
  // Hooks live here (CountryCards stays mounted) so the window keeps its
  // position/size when you close it and open the next country. Default: a WIDE
  // window CENTERED on screen (short + multi-column layout inside).
  const W = Math.min(880, window.innerWidth - 32);
  const H = Math.min(680, window.innerHeight - 96);
  const drag = useDraggable(
    Math.max(16, Math.round((window.innerWidth - W) / 2)),
    Math.max(16, Math.round((window.innerHeight - H) / 2)),
  );
  const resize = useResizable(W, H);
  const iso = selectedIsos[0];
  const country = iso != null ? world.countries.find((c) => c.iso === iso) : undefined;
  if (!country) return null;
  return <CountryCard country={country} drag={drag} resize={resize} />;
}
