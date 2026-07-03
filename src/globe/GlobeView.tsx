// The 3D globe: full-earth choropleth (G20 colored by a live metric), animated
// bilateral trade arcs, and click-to-select. Built on react-globe.gl (globe.gl
// + three.js). Polygon geometry stays stable; only the color/altitude ACCESSORS
// change each tick, so the choropleth animates cheaply as the simulation runs.

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { citiesFor } from "../data/allCities";
import { COUNTRY_FEATURES, featureIso, type CountryFeature } from "../data/countries";
import { G20_BY_ISO, G20_BY_NAME } from "../data/g20";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";
import { sampleAt } from "./geo";
import { metricColor, type Metric } from "./metricScale";
import { ROUTES, buildVehicles, routeAltitude, type RouteKind } from "./routes";
import { makePlane, makeShip, makeTrain, makeTruck } from "./vehicleMesh";

// Distinct color per transport mode (air/sea international; road/rail internal).
const PATH_COLORS: Record<RouteKind, string> = {
  air: "rgba(56,189,248,0.5)", // cyan
  sea: "rgba(244,114,182,0.5)", // pink
  road: "rgba(239,68,68,0.95)", // red — high contrast on gold land
  rail: "rgba(34,197,94,0.95)", // green
};

export type LayerState = Record<RouteKind | "cities", boolean>;

/** Combined route visibility: the mode's layer must be on, both endpoints must
 *  be in scope, and internal (road/rail) routes show only for the selected
 *  country (air/sea show globally, filtered to the selection when one is set). */
function routeVisible(
  kind: RouteKind,
  from: number,
  to: number,
  sel: number | null,
  layers: LayerState,
  scope: Set<number>,
): boolean {
  if (!layers[kind]) return false;
  const internal = kind === "road" || kind === "rail";
  if (internal ? !scope.has(from) : !scope.has(from) || !scope.has(to)) return false;
  if (sel === null) return !internal;
  return internal ? from === sel : from === sel || to === sel;
}

export type { Metric };

const NON_G20_COLOR = "#0f1d33";

/** Mix an "rgb(r,g,b)" color toward white by `amt` (0..1) — used to highlight. */
function lightenRgb(rgb: string, amt: number): string {
  const m = rgb.match(/\d+/g);
  if (!m) return rgb;
  const mix = (v: number) => Math.round(v + (255 - v) * amt);
  return `rgb(${mix(+m[0])},${mix(+m[1])},${mix(+m[2])})`;
}

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

interface PathDatum {
  kind: RouteKind;
  from: number;
  to: number;
  coords: Array<[number, number, number]>; // [lat, lng, altitude]
}

export function GlobeView({
  metric,
  layers,
  scope,
}: {
  metric: Metric;
  layers: LayerState;
  scope: Set<number>;
}) {
  const { world, selectedIsos, openCountry, closeCountry } = useSim();
  const { ref, size } = useElementSize();
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  // Currently selected country (or null) — read by the per-frame vehicle loop.
  const selected = selectedIsos[0] ?? null;
  // Refs so the per-frame vehicle loop reads current selection/layers/scope.
  const selRef = useRef<number | null>(selected);
  const layersRef = useRef(layers);
  const scopeRef = useRef(scope);
  useEffect(() => {
    selRef.current = selected;
    layersRef.current = layers;
    scopeRef.current = scope;
  }, [selected, layers, scope]);

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

  // Route lines (air = arched great circle, sea = surface lane), computed once.
  const allPaths = useMemo<PathDatum[]>(
    () =>
      ROUTES.map((r) => ({
        kind: r.kind,
        from: r.from,
        to: r.to,
        coords: r.points.map((p, i) => {
          const t = i / (r.points.length - 1);
          return [p[0], p[1], routeAltitude(r.kind, t)] as [number, number, number];
        }),
      })),
    [],
  );
  // Filter routes by layer toggles, scope, and selection.
  const paths = useMemo(
    () => allPaths.filter((p) => routeVisible(p.kind, p.from, p.to, selected, layers, scope)),
    [allPaths, selected, layers, scope],
  );

  // City points/labels for the selected country (any country; when "cities" on).
  const labels = useMemo(
    () =>
      selected != null && layers.cities
        ? citiesFor(selected).map((c) => ({ lat: c.lat, lng: c.lng, name: c.name }))
        : [],
    [selected, layers.cities],
  );

  // Moving planes & ships: added straight to the globe's three.js scene and
  // advanced each frame (reuses meshes -> cheap; no React re-render per frame).
  const ready = size.w > 0;
  useEffect(() => {
    const globe = globeEl.current;
    if (!globe) return;
    const scene = globe.scene();
    const vehicles = buildVehicles();
    const meshes = vehicles.map((v) =>
      v.kind === "air" ? makePlane()
        : v.kind === "sea" ? makeShip()
          : v.kind === "road" ? makeTruck()
            : makeTrain(),
    );
    meshes.forEach((m) => scene.add(m));

    let raf = 0;
    let last = performance.now();
    const ahead = new THREE.Vector3();
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sel = selRef.current;
      const lyr = layersRef.current;
      const scp = scopeRef.current;
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const r = ROUTES[v.routeIndex];
        v.t += v.tPerSec * dt;
        if (v.t > 1) v.t -= 1;
        const m = meshes[i];
        // Show only vehicles on currently-visible routes.
        const visible = routeVisible(r.kind, r.from, r.to, sel, lyr, scp);
        m.visible = visible;
        if (!visible) continue;
        const s = sampleAt(r.points, r.cum, v.t);
        const alt = routeAltitude(r.kind, v.t);
        const pos = globe.getCoords(s.lat, s.lng, alt);
        const ap = globe.getCoords(s.aheadLat, s.aheadLng, alt);
        m.position.set(pos.x, pos.y, pos.z);
        m.up.set(pos.x, pos.y, pos.z).normalize();
        m.lookAt(ahead.set(ap.x, ap.y, ap.z));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      // Geometry/material are shared singletons — remove from scene, don't dispose.
      for (const m of meshes) scene.remove(m);
    };
  }, [ready]);

  const g20Datum = (f: CountryFeature) =>
    G20_BY_ISO[featureIso(f)] ?? G20_BY_NAME[f.properties.name];

  return (
    <div ref={ref} className="absolute inset-0">
      {ready && (
        <Globe
          ref={globeEl}
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
            const feat = f as CountryFeature;
            const d = g20Datum(feat);
            if (!d) {
              // Non-G20: dim, slightly brighter when selected (its cities show).
              return selectedIsos.includes(featureIso(feat)) ? "#233a5c" : NON_G20_COLOR;
            }
            if (!scope.has(d.iso)) return "#16233a"; // out of scope: dimmed
            const c = byIso[d.iso];
            if (!c) return NON_G20_COLOR;
            const base = metricColor(metric, c);
            // Highlight the selected country by brightening its fill a touch (no
            // raise). Kept subtle so internal road/rail lines stay high-contrast.
            return selectedIsos.includes(d.iso) ? lightenRgb(base, 0.22) : base;
          }}
          polygonSideColor={() => "rgba(6,12,24,0.75)"}
          polygonStrokeColor={(f: object) => {
            const feat = f as CountryFeature;
            const d = g20Datum(feat);
            const iso = d?.iso ?? featureIso(feat);
            if (selectedIsos.includes(iso)) return "#ffffff";
            if (!d) return "#141f33";
            return scope.has(d.iso) ? "#2a3b5a" : "#141f33";
          }}
          // Flat: the selected country is NOT raised — only outlined (below).
          polygonAltitude={(f: object) => (g20Datum(f as CountryFeature) ? 0.02 : 0.006)}
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
            const feat = f as CountryFeature;
            const iso = g20Datum(feat)?.iso ?? featureIso(feat);
            if (Number.isFinite(iso)) openCountry(iso);
          }}
          onGlobeClick={() => {
            for (const iso of selectedIsos) closeCountry(iso);
          }}
          // --- City point markers for the selected country ---
          pointsData={labels}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "#e0f2fe"}
          pointAltitude={0.026}
          pointRadius={0.34}
          pointResolution={6}
          pointsMerge={false}
          pointsTransitionDuration={0}
          // --- City name labels (HTML: crisp small text, no accent clipping) ---
          htmlElementsData={labels}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.03}
          htmlElement={(d: object) => {
            const el = document.createElement("div");
            el.style.cssText = "pointer-events:none;white-space:nowrap;";
            el.innerHTML =
              `<div style="transform:translate(-50%,-165%);font:600 10px system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;text-shadow:0 1px 3px #000,0 0 2px #000;">${(d as { name: string }).name}</div>`;
            return el;
          }}
          // --- Trade routes (air = light blue arcs, sea = teal lanes) ---
          pathsData={paths}
          pathPoints="coords"
          pathPointLat={(p: unknown) => (p as number[])[0]}
          pathPointLng={(p: unknown) => (p as number[])[1]}
          pathPointAlt={(p: unknown) => (p as number[])[2]}
          pathColor={(d: object) => PATH_COLORS[(d as PathDatum).kind]}
          pathStroke={(d: object) => {
            const k = (d as PathDatum).kind;
            // Internal road/rail are drawn thicker so they read at country zoom.
            return k === "road" || k === "rail" ? 1.2 : k === "sea" ? 0.9 : 0.5;
          }}
          pathDashLength={0.5}
          pathDashGap={0.35}
          pathDashAnimateTime={6000}
          pathTransitionDuration={0}
        />
      )}
    </div>
  );
}
