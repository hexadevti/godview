// Bottom control bar: scenario picker, play/pause, speed, reset, and the
// simulated clock (1 tick = 1 week).

import { useI18n } from "../i18n/i18n";
import { SCENARIOS } from "../sim/engine";
import { useSim } from "../state/store";

const SPEEDS = [1, 2, 4];

export function Timeline() {
  const { running, speed, scenarioId, world, play, pause, reset, setSpeed, setScenario, setCommodity } =
    useSim();
  const { t } = useI18n();

  const years = Math.floor(world.tick / 52);
  const weeks = world.tick % 52;
  const commodity = world.commodityPrice;
  const shocked = commodity > 105;

  return (
    <div className="pointer-events-auto absolute bottom-0 left-1/2 z-40 mb-4 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-700/60 bg-[#0a0f1c]/55 px-4 py-2.5 shadow-xl backdrop-blur-lg">
      <select
        value={scenarioId}
        onChange={(e) => setScenario(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 focus:outline-none"
        title={t("timeline.scenarioTitle")}
      >
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {t(`scenario.${s.id}.label`)}
          </option>
        ))}
      </select>

      <div className="h-6 w-px bg-slate-700" />

      <button
        onClick={() => (running ? pause() : play())}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-400"
        title={running ? t("timeline.pause") : t("timeline.play")}
      >
        {running ? "⏸" : "▶"}
      </button>

      <div className="flex items-center gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              speed === s ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <button
        onClick={reset}
        className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
        title={t("timeline.resetTitle")}
      >
        ⟲ {t("timeline.reset")}
      </button>

      <div className="h-6 w-px bg-slate-700" />

      {/* Global commodity/energy price + shock event */}
      <button
        onClick={() => setCommodity(shocked ? 100 : 160)}
        title={shocked ? t("timeline.commodityNormalize") : t("timeline.commodityShock")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
          shocked ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
        }`}
      >
        🛢️ {commodity.toFixed(0)}
        <span className="text-[0.625rem] font-normal text-slate-400">
          {shocked ? t("timeline.normalizeShort") : t("timeline.shockShort")}
        </span>
      </button>

      <div className="h-6 w-px bg-slate-700" />

      <div className="min-w-[92px] text-right font-mono text-sm text-slate-300" title={t("timeline.clockTitle")}>
        {t("timeline.clock", { y: years, w: weeks.toString().padStart(2, "0") })}
      </div>
    </div>
  );
}
