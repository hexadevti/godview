import { useMemo, useState } from "react";
import { G20, SNAPSHOT_META } from "./data/g20";
import { SCOPES } from "./data/scopes";
import { GlobeView, type LayerState, type Metric } from "./globe/GlobeView";
import { CountryCards } from "./panels/CountryPanel";
import { Legend } from "./panels/Legend";
import { Timeline } from "./panels/Timeline";
import { WorldTable } from "./panels/WorldTable";
import { SCENARIOS } from "./sim/engine";
import { SimProvider, useSim } from "./state/store";

const METRICS: Array<{ id: Metric; label: string }> = [
  { id: "gdp", label: "Poder (PIB)" },
  { id: "gdpPerCapita", label: "PIB per capita" },
  { id: "population", label: "População" },
  { id: "growth", label: "Crescimento" },
  { id: "inflation", label: "Inflação" },
  { id: "unemployment", label: "Desemprego" },
  { id: "inequality", label: "Desigualdade" },
  { id: "approval", label: "Aprovação" },
];

const LAYER_DEFS: Array<{ id: keyof LayerState; label: string; color: string }> = [
  { id: "air", label: "Aéreo", color: "#38bdf8" },
  { id: "sea", label: "Marítimo", color: "#f472b6" },
  { id: "road", label: "Rodoviário", color: "#ef4444" },
  { id: "rail", label: "Ferroviário", color: "#22c55e" },
  { id: "cities", label: "Cidades", color: "#e2e8f0" },
  { id: "cables", label: "Cabos", color: "#a78bfa" },
  { id: "rivers", label: "Hidrovias", color: "#60a5fa" },
  { id: "datacenters", label: "Datacenters", color: "#38bdf8" },
  { id: "satellites", label: "Satélites", color: "#67e8f9" },
];

const ALL_ISOS = G20.map((d) => d.iso);

function Shell() {
  const [metric, setMetric] = useState<Metric>("gdp");
  const [showTable, setShowTable] = useState(false);
  const [scopeId, setScopeId] = useState("g20");
  const [layers, setLayers] = useState<LayerState>({
    air: true, sea: true, road: true, rail: true, cities: true,
    cables: false, rivers: false, datacenters: false, satellites: false,
  });
  const { scenarioId } = useSim();
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  const scope = useMemo(() => {
    const s = SCOPES.find((x) => x.id === scopeId);
    return new Set(s?.isos ?? ALL_ISOS);
  }, [scopeId]);

  const toggleLayer = (id: keyof LayerState) => setLayers((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GlobeView metric={metric} layers={layers} scope={scope} />

      {/* Title (top-left) */}
      <div className="pointer-events-auto absolute left-4 top-4 z-40 w-60 rounded-xl border border-slate-700/60 bg-[#0a0f1c]/55 px-4 py-2.5 backdrop-blur-lg">
        <h1 className="text-base font-bold tracking-tight text-white">
          GodView <span className="text-sky-400">·</span>{" "}
          <span className="text-xs font-normal text-slate-400">Macroeconomia Global</span>
        </h1>
        {scenario && <p className="mt-0.5 text-xs text-slate-400">{scenario.note}</p>}
        {scenario?.objective && (
          <p className="mt-1 rounded-md bg-sky-500/10 px-2 py-1 text-[11px] text-sky-300">🎯 {scenario.objective}</p>
        )}
        <button
          onClick={() => setShowTable((v) => !v)}
          className={`mt-2 rounded-md px-2.5 py-1 text-xs font-semibold ${
            showTable ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          📊 {showTable ? "Ocultar tabela mundial" : "Tabela mundial"}
        </button>
        <p className="mt-2 text-[10px] text-slate-500" title={SNAPSHOT_META.source.macro}>
          Macro real: World Bank · snapshot {SNAPSHOT_META.asOf}
        </p>
      </div>

      {/* Right column: controls (metric/legend/scope/layers) + country card */}
      <div className="pointer-events-none absolute bottom-4 right-4 top-4 z-40 flex w-[340px] flex-col gap-2">
        <div className="pointer-events-auto flex-none rounded-xl border border-slate-700/60 bg-[#0a0f1c]/55 px-3 py-2 backdrop-blur-lg">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  metric === m.id ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Legend metric={metric} />

          <div className="my-2 h-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Escopo</span>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200 focus:outline-none"
            >
              {SCOPES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-1 mt-2 text-[10px] uppercase tracking-wide text-slate-400">Camadas</div>
          <div className="flex flex-wrap gap-1">
            {LAYER_DEFS.map((l) => (
              <button
                key={l.id}
                onClick={() => toggleLayer(l.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                  layers[l.id] ? "bg-slate-700 text-white" : "bg-slate-900 text-slate-500"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: layers[l.id] ? l.color : "#475569" }}
                />
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hint (bottom-left) */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 max-w-xs text-xs text-slate-500">
        Clique num país para abrir os ajustes e ver sua malha interna. Arraste para girar o globo.
      </div>

      {showTable && <WorldTable onClose={() => setShowTable(false)} scope={scope} />}
      <CountryCards />
      <Timeline />
    </div>
  );
}

export default function App() {
  return (
    <SimProvider>
      <Shell />
    </SimProvider>
  );
}
