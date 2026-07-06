import { useMemo, useState } from "react";
import logoUrl from "./assets/godview-logo.png";
import { G20, SNAPSHOT_META } from "./data/g20";
import { SCOPES } from "./data/scopes";
import { GlobeView, type BaseMap, type LayerState, type Metric } from "./globe/GlobeView";
import { LANGS, useI18n } from "./i18n/i18n";
import { CountryCards } from "./panels/CountryPanel";
import { Legend } from "./panels/Legend";
import { Timeline } from "./panels/Timeline";
import { WorldTable } from "./panels/WorldTable";
import { SCENARIOS } from "./sim/engine";
import { SimProvider, useSim } from "./state/store";

const METRICS: Metric[] = [
  "gdp", "gdpPerCapita", "population", "growth", "inflation", "unemployment", "inequality", "education", "approval",
];

const LAYER_DEFS: Array<{ id: keyof LayerState; color: string }> = [
  { id: "air", color: "#38bdf8" },
  { id: "sea", color: "#f472b6" },
  { id: "road", color: "#ef4444" },
  { id: "rail", color: "#22c55e" },
  { id: "cities", color: "#e2e8f0" },
  { id: "cables", color: "#a78bfa" },
  { id: "rivers", color: "#60a5fa" },
  { id: "datacenters", color: "#38bdf8" },
  { id: "satellites", color: "#67e8f9" },
  { id: "clouds", color: "#e2e8f0" },
  { id: "sky", color: "#fde68a" },
];

const BASE_MAPS: BaseMap[] = ["political", "terrain", "satellite", "agora", "night", "hydro"];

const ALL_ISOS = G20.map((d) => d.iso);

/** Compact PT / EN / ES language switcher. */
function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex gap-0.5" title={t("app.language")}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          onClick={() => setLang(l.id)}
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            lang === l.id ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function Shell() {
  const [metric, setMetric] = useState<Metric>("gdp");
  const [baseMap, setBaseMap] = useState<BaseMap>("political");
  const [reliefScale, setReliefScale] = useState(6);
  const [showTable, setShowTable] = useState(false);
  const [scopeId, setScopeId] = useState("g20");
  const [layers, setLayers] = useState<LayerState>({
    air: true, sea: true, road: true, rail: true, cities: true,
    cables: false, rivers: false, datacenters: false, satellites: false, clouds: false, sky: false,
  });
  const { scenarioId } = useSim();
  const { t } = useI18n();
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  const scope = useMemo(() => {
    const s = SCOPES.find((x) => x.id === scopeId);
    return new Set(s?.isos ?? ALL_ISOS);
  }, [scopeId]);

  const toggleLayer = (id: keyof LayerState) => setLayers((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GlobeView metric={metric} layers={layers} scope={scope} baseMap={baseMap} reliefScale={reliefScale} />

      {/* Title (top-left) */}
      <div className="pointer-events-auto absolute left-4 top-4 z-40 w-60 rounded-xl border border-slate-700/60 bg-[#0a0f1c]/55 px-4 py-2.5 backdrop-blur-lg">
        <div className="flex items-center justify-between gap-2">
          <img src={logoUrl} alt="GodView" className="h-9 w-auto" />
          <LanguageSwitcher />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{t("app.subtitle")}</p>
        {scenario && <p className="mt-0.5 text-xs text-slate-400">{t(`scenario.${scenarioId}.note`)}</p>}
        {scenario?.objective && (
          <p className="mt-1 rounded-md bg-sky-500/10 px-2 py-1 text-[11px] text-sky-300">
            🎯 {t(`scenario.${scenarioId}.objective`)}
          </p>
        )}
        <button
          onClick={() => setShowTable((v) => !v)}
          className={`mt-2 rounded-md px-2.5 py-1 text-xs font-semibold ${
            showTable ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          📊 {showTable ? t("app.hideWorldTable") : t("app.worldTable")}
        </button>
        <p className="mt-2 text-[10px] text-slate-500" title={SNAPSHOT_META.source.macro}>
          {t("app.macroSource", { date: SNAPSHOT_META.asOf })}
        </p>
      </div>

      {/* Right column: controls (metric/legend/scope/layers) + country card */}
      <div className="pointer-events-none absolute bottom-4 right-4 top-4 z-40 flex w-[340px] flex-col gap-2">
        <div className="pointer-events-auto flex-none rounded-xl border border-slate-700/60 bg-[#0a0f1c]/55 px-3 py-2 backdrop-blur-lg">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">{t("app.baseMap")}</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {BASE_MAPS.map((b) => (
              <button
                key={b}
                onClick={() => setBaseMap(b)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  baseMap === b ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {t(`basemap.${b}`)}
              </button>
            ))}
          </div>

          {baseMap === "terrain" && (
            <div className="mb-1 mt-1.5 flex items-center gap-2">
              <span className="w-12 text-[10px] uppercase tracking-wide text-slate-400">{t("app.relief")}</span>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={reliefScale}
                onChange={(e) => setReliefScale(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer accent-sky-400"
              />
              <span className="w-9 text-right text-[11px] font-semibold tabular-nums text-sky-300">
                ×{Math.round(reliefScale * 1.7)}
              </span>
            </div>
          )}

          <div className="my-2 h-px bg-slate-800" />

          {baseMap === "political" && (
            <>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">{t("app.metricColor")}</div>
              <div className="mb-1.5 flex flex-wrap gap-1">
                {METRICS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      metric === m ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {t(`metric.${m}`)}
                  </button>
                ))}
              </div>
              <Legend metric={metric} />
              <div className="my-2 h-px bg-slate-800" />
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-400">{t("app.scope")}</span>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200 focus:outline-none"
            >
              {SCOPES.map((s) => (
                <option key={s.id} value={s.id}>{t(`scope.${s.id}`)}</option>
              ))}
            </select>
          </div>

          <div className="mb-1 mt-2 text-[10px] uppercase tracking-wide text-slate-400">{t("app.layers")}</div>
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
                {t(`layer.${l.id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hint (bottom-left) */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 max-w-xs text-xs text-slate-500">
        {t("app.hint")}
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
