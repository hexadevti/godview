// Gradient color legend for the active globe metric. The bar is a linear
// gradient between the scale's endpoint colors; tick values are placed at
// their t position, so the GDP log scale reads correctly (0.3T…30T unevenly
// spaced) while growth/inflation read linearly.

import { METRIC_SCALES, type Metric } from "../globe/metricScale";

export function Legend({ metric }: { metric: Metric }) {
  const s = METRIC_SCALES[metric];
  return (
    <div className="mt-1.5 w-[240px]">
      <div className="mb-1 text-[10px] text-slate-400">{s.label}</div>
      <div
        className="h-2.5 w-full rounded-sm"
        style={{ background: `linear-gradient(to right, ${s.lo}, ${s.hi})` }}
      />
      <div className="relative mt-1 h-3 w-full">
        {s.ticks.map((v) => {
          const t = s.t(v);
          // Keep the first/last labels from clipping outside the bar.
          const align =
            t <= 0.02 ? "translateX(0)" : t >= 0.98 ? "translateX(-100%)" : "translateX(-50%)";
          return (
            <span
              key={v}
              className="absolute top-0 text-[9px] tabular-nums text-slate-400"
              style={{ left: `${t * 100}%`, transform: align }}
            >
              {s.fmt(v)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
