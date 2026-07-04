// The 3D globe: full-earth choropleth (G20 colored by a live metric), animated
// bilateral trade arcs, and click-to-select. Built on react-globe.gl (globe.gl
// + three.js). Polygon geometry stays stable; only the color/altitude ACCESSORS
// change each tick, so the choropleth animates cheaply as the simulation runs.

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { citiesFor } from "../data/allCities";
import { COUNTRY_FEATURES, featureIso, type CountryFeature } from "../data/countries";
import { DATACENTERS } from "../data/datacenters";
import { G20_BY_ISO, G20_BY_NAME } from "../data/g20";
import cablesData from "../data/generated/cables.json";
import satsData from "../data/generated/satellites.json";
import { WATERWAYS } from "../data/waterways";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";
import { sampleAt } from "./geo";
import { metricColor, type Metric } from "./metricScale";
import { ROUTES, buildVehicles, routeAltitude, type RouteKind } from "./routes";
import { makePlane, makeShip, makeTrain, makeTruck } from "./vehicleMesh";

type PathKind = RouteKind | "cable" | "river";

// Distinct color per line layer.
const PATH_COLORS: Record<PathKind, string> = {
  air: "rgba(56,189,248,0.5)", // cyan
  sea: "rgba(244,114,182,0.5)", // pink
  road: "rgba(239,68,68,0.95)", // red — high contrast on gold land
  rail: "rgba(34,197,94,0.95)", // green
  cable: "rgba(167,139,250,0.55)", // violet — submarine cables
  river: "rgba(96,165,250,0.75)", // blue — waterways
};

export type LayerState = Record<
  RouteKind | "cities" | "cables" | "rivers" | "datacenters" | "satellites",
  boolean
>;

interface PathDatum {
  kind: PathKind;
  from: number;
  to: number;
  coords: Array<[number, number, number]>; // [lat, lng, altitude]
}

// Global infrastructure line layers (computed once).
const CABLE_PATHS: PathDatum[] = (cablesData.segments as unknown as Array<{ w: [number, number][] }>).map((s) => ({
  kind: "cable",
  from: 0,
  to: 0,
  coords: s.w.map(([lat, lng]) => [lat, lng, 0.002] as [number, number, number]),
}));
const RIVER_PATHS: PathDatum[] = WATERWAYS.map((w) => ({
  kind: "river" as const,
  from: 0,
  to: 0,
  coords: w.waypoints.map(([lat, lng]) => [lat, lng, 0.004] as [number, number, number]),
}));

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
  // Filter transport routes by layer/scope/selection, then append the global
  // infrastructure line layers (cables, waterways) when their layer is on.
  const paths = useMemo(() => {
    const out = allPaths.filter((p) =>
      routeVisible(p.kind as RouteKind, p.from, p.to, selected, layers, scope),
    );
    if (layers.cables) out.push(...CABLE_PATHS);
    if (layers.rivers) out.push(...RIVER_PATHS);
    return out;
  }, [allPaths, selected, layers, scope]);

  // City points/labels for the selected country (any country; when "cities" on).
  const cityLabels = useMemo(
    () =>
      selected != null && layers.cities
        ? citiesFor(selected).map((c) => ({ lat: c.lat, lng: c.lng, name: c.name, kind: "city" as const }))
        : [],
    [selected, layers.cities],
  );
  // Datacenter markers (dot + hover name) when the layer is on.
  const dcLabels = useMemo(
    () => (layers.datacenters ? DATACENTERS.map((d) => ({ lat: d.lat, lng: d.lng, name: d.name, kind: "dc" as const })) : []),
    [layers.datacenters],
  );
  // Combined HTML layer: city names + datacenter markers. Points layer = cities only.
  const htmlItems = useMemo(() => [...cityLabels, ...dcLabels], [cityLabels, dcLabels]);

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

  // Satellites: real TLE propagated with satellite.js (SGP4), drawn as a single
  // THREE.Points (1 draw call) whose positions update each frame. Time is sped
  // up so orbital motion is visible; altitude compressed so MEO/GEO stay on screen.
  useEffect(() => {
    const globe = globeEl.current;
    if (!globe) return;
    const scene = globe.scene();
    const recs = satsData.sats
      .map((s) => {
        try {
          return { rec: satellite.twoline2satrec(s.l1, s.l2), group: s.group };
        } catch {
          return null;
        }
      })
      .filter((x): x is { rec: satellite.SatRec; group: string } => !!x);
    const n = recs.length;
    if (n === 0) return;

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const cLeo = new THREE.Color(0x67e8f9), cMeo = new THREE.Color(0xfbbf24), cGeo = new THREE.Color(0xf9a8d4);
    recs.forEach((r, i) => {
      const c = r.group === "geo" ? cGeo : r.group === "gps" ? cMeo : cLeo;
      colors.set([c.r, c.g, c.b], i * 3);
    });
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, sizeAttenuation: true });
    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    scene.add(points);

    const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
    const wall0 = performance.now();
    const sim0 = Date.now();
    const SPEED = 120; // 120x real time
    let raf = 0;
    const step = () => {
      points.visible = layersRef.current.satellites;
      if (points.visible) {
        const date = new Date(sim0 + (performance.now() - wall0) * SPEED);
        const gmst = satellite.gstime(date);
        for (let i = 0; i < n; i++) {
          const pv = satellite.propagate(recs[i].rec, date);
          const eci = pv && pv.position;
          if (!eci || typeof eci === "boolean") { posAttr.setXYZ(i, 0, 0, 0); continue; }
          const geo = satellite.eciToGeodetic(eci, gmst);
          let alt = geo.height / 6371;
          if (!Number.isFinite(alt) || alt < 0) alt = 0.1;
          const p = globe.getCoords(satellite.degreesLat(geo.latitude), satellite.degreesLong(geo.longitude), Math.min(alt, 1.2));
          posAttr.setXYZ(i, p.x, p.y, p.z);
        }
        posAttr.needsUpdate = true;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      scene.remove(points);
      geom.dispose();
      mat.dispose();
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
            // Countries in political crisis pulse red (blinks while the sim runs).
            if (c.inCrisis) return world.tick % 2 === 0 ? "#ef4444" : "#7f1d1d";
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
                <b>${c.name}</b>${c.inCrisis ? ' <span style="color:#f87171">⚠ crise</span>' : ""}<br/>
                PIB: $${c.gdp.toFixed(2)} tri<br/>
                População: ${c.population >= 1000 ? (c.population / 1000).toFixed(2) + " bi" : c.population.toFixed(1) + " mi"}<br/>
                Crescimento: ${c.gdpGrowthAnn.toFixed(1)}%<br/>
                Inflação: ${c.inflationAnn.toFixed(1)}%<br/>
                Desemprego: ${c.unemployment.toFixed(1)}%<br/>
                Aprovação: ${c.approval.toFixed(0)}/100
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
          pointsData={cityLabels}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "#e0f2fe"}
          pointAltitude={0.026}
          pointRadius={0.34}
          pointResolution={6}
          pointsMerge={false}
          pointsTransitionDuration={0}
          // --- HTML labels: city names + datacenter markers (hover to name) ---
          htmlElementsData={htmlItems}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={(d: object) => ((d as { kind: string }).kind === "dc" ? 0.02 : 0.03)}
          htmlElement={(d: object) => {
            const item = d as { name: string; kind: string };
            const el = document.createElement("div");
            if (item.kind === "dc") {
              el.className = "gv-dc";
              el.innerHTML = `<span class="gv-dc-dot"></span><span class="gv-dc-name">${item.name}</span>`;
              return el;
            }
            el.style.cssText = "pointer-events:none;white-space:nowrap;";
            el.innerHTML =
              `<div style="transform:translate(-50%,-165%);font:600 10px system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;text-shadow:0 1px 3px #000,0 0 2px #000;">${item.name}</div>`;
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
            if (k === "cable") return 0.25; // thin submarine cables
            if (k === "river") return 0.6;
            // Internal road/rail are drawn thicker so they read at country zoom.
            return k === "road" || k === "rail" ? 1.2 : k === "sea" ? 0.9 : 0.5;
          }}
          pathDashLength={0.5}
          pathDashGap={0.35}
          pathDashAnimateTime={6000}
          pathTransitionDuration={0}
          // --- Datacenter hubs (pulsing rings) ---
          ringsData={layers.datacenters ? DATACENTERS : []}
          ringLat="lat"
          ringLng="lng"
          ringAltitude={0.01}
          ringColor={() => (t: number) => `rgba(56,189,248,${1 - t})`}
          ringMaxRadius={2.6}
          ringPropagationSpeed={1.4}
          ringRepeatPeriod={1500}
        />
      )}
    </div>
  );
}
