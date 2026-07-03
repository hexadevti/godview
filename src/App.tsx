import { useState } from "react";
import { GlobeView, type Metric } from "./globe/GlobeView";
import { CountryCards } from "./panels/CountryPanel";
import { Legend } from "./panels/Legend";
import { Timeline } from "./panels/Timeline";
import { WorldTable } from "./panels/WorldTable";
import { SCENARIOS } from "./sim/engine";
import { SimProvider, useSim } from "./state/store";

const METRICS: Array<{ id: Metric; label: string }> = [
  { id: "gdp", label: "Poder (PIB)" },
  { id: "growth", label: "Crescimento" },
  { id: "inflation", label: "Inflação" },
];

function Shell() {
  const [metric, setMetric] = useState<Metric>("gdp");
  const [showTable, setShowTable] = useState(false);
  const { scenarioId } = useSim();
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GlobeView metric={metric} />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-xl border border-slate-800 bg-[#0a0f1c]/85 px-4 py-2.5 backdrop-blur">
          <h1 className="text-lg font-bold tracking-tight text-white">
            GodView <span className="text-sky-400">·</span>{" "}
            <span className="text-sm font-normal text-slate-400">Simulador de Macroeconomia Global</span>
          </h1>
          {scenario && <p className="mt-0.5 max-w-md text-xs text-slate-400">{scenario.note}</p>}
          <button
            onClick={() => setShowTable((v) => !v)}
            className={`mt-2 rounded-md px-2.5 py-1 text-xs font-semibold ${
              showTable ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            📊 {showTable ? "Ocultar tabela mundial" : "Tabela mundial"}
          </button>
        </div>

        <div className="pointer-events-auto rounded-xl border border-slate-800 bg-[#0a0f1c]/85 px-3 py-2 backdrop-blur">
          <div className="mb-1.5 flex gap-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  metric === m.id ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Legend metric={metric} />
        </div>
      </div>

      {/* Hint (bottom-left) */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 max-w-xs text-xs text-slate-500">
        Clique num país do G20 para abrir os ajustes. Arraste para girar o globo.
      </div>

      {showTable && <WorldTable onClose={() => setShowTable(false)} />}
      <Timeline />
      <CountryCards />
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
