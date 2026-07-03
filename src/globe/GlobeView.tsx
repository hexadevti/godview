// The 3D globe: full-earth choropleth (G20 colored by a live metric), animated
// bilateral trade arcs, and click-to-select. Built on react-globe.gl (globe.gl
// + three.js). Polygon geometry stays stable; only the color/altitude ACCESSORS
// change each tick, so the choropleth animates cheaply as the simulation runs.

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { COUNTRY_FEATURES, featureIso, type CountryFeature } from "../data/countries";
import { G20_BY_ISO, G20_BY_NAME } from "../data/g20";
import { TRADE_FLOWS } from "../data/trade";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";
import { metricColor, type Metric } from "./metricScale";

export type { Metric };

const NON_G20_COLOR = "#0f1d33";

/** Measure a container element so the globe fills it responsively. */
function useElementSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

export function GlobeView({ metric }: { metric: Metric }) {
  const { world, selectedIsos, openCountry } = useSim();
  const { ref, size } = useElementSize();

  // Live lookup rebuilt each tick so accessors read current values.
  const byIso = useMemo(() => {
    const m: Record<number, CountryState> = {};
    for (const c of world.countries) m[c.iso] = c;
    return m;
  }, [world]);

  // Dark ocean sphere (no external texture -> fully self-contained).
  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: "#0a1526", shininess: 6 }),
    [],
  );

  // Static trade arcs joined with G20 centroids (computed once).
  const arcs = useMemo(() => {
    const maxVal = Math.max(...TRADE_FLOWS.map((f) => f.value));
    return TRADE_FLOWS.flatMap((f) => {
      const a = G20_BY_ISO[f.from];
      const b = G20_BY_ISO[f.to];
      if (!a || !b) return [];
      return [{
        startLat: a.lat, startLng: a.lng,
        endLat: b.lat, endLng: b.lng,
        value: f.value,
        stroke: 0.25 + (f.value / maxVal) * 1.4,
      }];
    });
  }, []);

  const g20Datum = (f: CountryFeature) =>
    G20_BY_ISO[featureIso(f)] ?? G20_BY_NAME[f.properties.name];

  return (
    <div ref={ref} className="absolute inset-0">
      {size.w > 0 && (
        <Globe
          width={size.w}
          height={size.h}
          backgroundColor="#05070f"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor="#3a6ea5"
          atmosphereAltitude={0.18}
          // --- Countries ---
          polygonsData={COUNTRY_FEATURES}
          polygonsTransitionDuration={0}
          polygonCapColor={(f: object) => {
            const d = g20Datum(f as CountryFeature);
            if (!d) return NON_G20_COLOR;
            const c = byIso[d.iso];
            return c ? metricColor(metric, c) : NON_G20_COLOR;
          }}
          polygonSideColor={() => "rgba(6,12,24,0.75)"}
          polygonStrokeColor={(f: object) => {
            const d = g20Datum(f as CountryFeature);
            return d && selectedIsos.includes(d.iso) ? "#ffffff" : "#1a2b47";
          }}
          polygonAltitude={(f: object) => {
            const d = g20Datum(f as CountryFeature);
            if (!d) return 0.006;
            return selectedIsos.includes(d.iso) ? 0.09 : 0.02;
          }}
          polygonLabel={(f: object) => {
            const feat = f as CountryFeature;
            const d = g20Datum(feat);
            if (!d) return `<div style="color:#94a3b8">${feat.properties.name}</div>`;
            const c = byIso[d.iso];
            if (!c) return `<b>${d.name}</b>`;
            return `
              <div style="font-family:system-ui;background:#0d1626;border:1px solid #22314f;padding:8px 10px;border-radius:8px;color:#e7ecf5">
                <b>${c.name}</b><br/>
                PIB: $${c.gdp.toFixed(2)} tri<br/>
                Crescimento: ${c.gdpGrowthAnn.toFixed(1)}%<br/>
                Inflação: ${c.inflationAnn.toFixed(1)}%<br/>
                Juros: ${c.controls.policyRate.toFixed(2)}%
              </div>`;
          }}
          onPolygonClick={(f: object) => {
            const d = g20Datum(f as CountryFeature);
            if (d) openCountry(d.iso);
          }}
          // --- Trade arcs ---
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={() => ["rgba(56,189,248,0.05)", "rgba(56,189,248,0.85)"]}
          arcStroke="stroke"
          arcDashLength={0.4}
          arcDashGap={0.25}
          arcDashAnimateTime={2200}
          arcAltitudeAutoScale={0.42}
        />
      )}
    </div>
  );
}
