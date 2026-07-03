// Floating country inspector cards. One card per open country — clicking
// another country adds a card without closing the previous ones. Each card
// shows live stats, the adjustable levers, and time-series charts.

import * as Slider from "@radix-ui/react-slider";
import {
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-100">{value}</div>
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
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-slate-200">{label}</span>
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
    <div className="h-32 w-full">
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CountryCard({ country }: { country: CountryState }) {
  const { history, closeCountry, setControl } = useSim();
  const hist = history[country.iso] ?? [];
  const change = (field: keyof CountryControls) => (v: number) => setControl(country.iso, field, v);

  return (
    <div
      data-testid="country-card"
      className="gv-scroll pointer-events-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto rounded-2xl border border-slate-800 bg-[#0a0f1c]/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{country.name}</h2>
          <p className="text-[11px] text-slate-400">Ajuste as alavancas e observe a propagação.</p>
        </div>
        <button
          onClick={() => closeCountry(country.iso)}
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Fechar"
        >
          ✕
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Stat label="PIB" value={`$${country.gdp.toFixed(2)} tri`} />
        <Stat label="Crescimento" value={`${country.gdpGrowthAnn.toFixed(1)}%`} />
        <Stat label="Inflação" value={`${country.inflationAnn.toFixed(1)}%`} />
        <Stat label="Câmbio (índice)" value={country.fx.toFixed(1)} />
        <Stat label="Saldo comercial" value={`${country.tradeBalancePctGdp.toFixed(1)}% PIB`} />
        <Stat label="Juros" value={`${country.controls.policyRate.toFixed(2)}%`} />
      </div>

      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Alavancas de política
        </div>
        <Lever label="Taxa de juros" unit="%" value={country.controls.policyRate} min={0} max={50} step={0.25} onChange={change("policyRate")} />
        <Lever label="Tarifa de importação" unit="%" value={country.controls.tariff} min={0} max={40} step={1} onChange={change("tariff")} />
        <Lever label="Gasto público" unit="" value={country.controls.govSpending} min={0} max={100} step={1} onChange={change("govSpending")} />
      </div>

      <div className="space-y-4">
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
            Câmbio — índice (100 = base; ↑ = moeda mais forte)
          </div>
          <MiniChart data={hist} lines={[{ key: "fx", color: "#38bdf8", label: "Câmbio" }]} domain={["auto", "auto"]} />
        </div>
      </div>
    </div>
  );
}

export function CountryCards() {
  const { world, selectedIsos } = useSim();
  const iso = selectedIsos[0];
  const country = iso != null ? world.countries.find((c) => c.iso === iso) : undefined;
  if (!country) return null;
  return <CountryCard country={country} />;
}
