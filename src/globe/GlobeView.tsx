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
import { countryName } from "../i18n/countryNames";
import { useI18n } from "../i18n/i18n";
import { formatPop } from "../panels/CountryPanel";
import { useSim } from "../state/store";
import type { CountryState } from "../sim/types";
import { sampleAt } from "./geo";
import { metricColor, type Metric } from "./metricScale";
import { ROUTES, buildVehicles, routeAltitude, type RouteKind } from "./routes";
import { makePlane, makeShip, makeTrain, makeTruck } from "./vehicleMesh";
// Earth textures — bundled offline by Vite. Day (NASA Blue Marble 5400×2700) and
// night (NASA Black Marble 3600×1800) are high-res; topology is the grayscale
// heightmap used for BOTH relief displacement and bump shading.
import dayUrl from "../assets/textures/earth-day-hi.jpg";
import topologyUrl from "../assets/textures/earth-topology.png";
import waterUrl from "../assets/textures/earth-water.png";
import nightUrl from "../assets/textures/earth-night-hi.jpg";
import moonUrl from "../assets/textures/moon.jpg";
import cloudsUrl from "../assets/textures/clouds.jpg";

/** Globe base map (earth surface), independent of the choropleth metric. */
export type BaseMap = "political" | "terrain" | "satellite" | "hydro" | "night" | "agora";

/** Direction (unit vector, globe world space) to the sun for the given moment —
 *  used to blend day/night. Subsolar point via the same getCoords the globe uses. */
function sunDirectionNow(globe: { getCoords: (lat: number, lng: number, alt: number) => { x: number; y: number; z: number } }): THREE.Vector3 {
  const now = new Date();
  const dayOfYear = (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000;
  const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)); // solar declination, deg
  const utcSec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  const subLng = 180 - (utcSec / 86400) * 360; // subsolar longitude (Greenwich noon ≈ 0°)
  const p = globe.getCoords(decl, subLng, 0);
  return new THREE.Vector3(p.x, p.y, p.z).normalize();
}

/** Direction (unit vector, globe world space) to the Moon now — low-precision
 *  lunar ephemeris (Schlyter) → RA/Dec → sublunar point via getCoords. */
function moonDirectionNow(globe: { getCoords: (lat: number, lng: number, alt: number) => { x: number; y: number; z: number } }): THREE.Vector3 {
  const now = new Date();
  const d = now.getTime() / 86400000 - 10957.5; // days since J2000 (2000-01-01 12:00 UT)
  const rad = Math.PI / 180;
  const rev = (x: number) => x - Math.floor(x / 360) * 360;
  const N = rev(125.1228 - 0.0529538083 * d) * rad; // ascending node
  const i = 5.1454 * rad; // inclination
  const w = rev(318.0634 + 0.1643573223 * d) * rad; // arg. of perigee
  const a = 60.2666, e = 0.0549; // mean distance (earth radii), eccentricity
  const M = rev(115.3654 + 13.0649929509 * d) * rad; // mean anomaly
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let k = 0; k < 3; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
  const xh = r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i));
  const yh = r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i));
  const zh = r * Math.sin(v + w) * Math.sin(i);
  const ecl = (23.4393 - 3.563e-7 * d) * rad; // obliquity
  const xe = xh;
  const ye = yh * Math.cos(ecl) - zh * Math.sin(ecl);
  const ze = yh * Math.sin(ecl) + zh * Math.cos(ecl);
  const RA = rev(Math.atan2(ye, xe) / rad);
  const Dec = Math.atan2(ze, Math.hypot(xe, ye)) / rad;
  const gmstDeg = (satellite.gstime(now) * 180) / Math.PI;
  let subLng = RA - gmstDeg;
  subLng = (((subLng + 180) % 360) + 360) % 360 - 180; // → [-180,180]
  const p = globe.getCoords(Dec, subLng, 0);
  return new THREE.Vector3(p.x, p.y, p.z).normalize();
}

// Relief exaggeration for terrain mode (globe radius = 100), so mountains are
// unmistakable — a strongly emphasized "×10"-style relief, not true scale.
const RELIEF_SCALE = 6;

/** Soft radial-gradient texture for the Sun's glow/corona sprite. */
function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, "rgba(255,252,245,1)");
  g.addColorStop(0.12, "rgba(255,244,214,0.85)");
  g.addColorStop(0.35, "rgba(255,206,120,0.35)");
  g.addColorStop(0.7, "rgba(255,180,90,0.08)");
  g.addColorStop(1.0, "rgba(255,170,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

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
  RouteKind | "cities" | "cables" | "rivers" | "datacenters" | "satellites" | "clouds" | "sky",
  boolean
>;

// Global cloud composite (equirectangular), bundled as a local asset so the app
// stays fully self-contained with no third-party runtime dependency. This is a
// static snapshot — to restore the near-real-time layer, point this back at
// https://clouds.matteason.co.uk/images/2048x1024/clouds.jpg (CORS-enabled).
const CLOUDS_URL = cloudsUrl;
const SHADER_MODES: BaseMap[] = ["satellite", "night", "agora"];

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
  baseMap,
  reliefScale = RELIEF_SCALE,
}: {
  metric: Metric;
  layers: LayerState;
  scope: Set<number>;
  baseMap: BaseMap;
  reliefScale?: number;
}) {
  const { world, selectedIsos, openCountry, closeCountry } = useSim();
  const { t, lang } = useI18n();
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

  // Globe surface material. Default = dark ocean sphere; base-map modes swap in
  // bundled earth textures (relief bump, water, blue marble, night lights).
  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: "#0a1526", shininess: 6 }),
    [],
  );

  // Lazily loaded + cached textures (each bundled offline, loaded on first use).
  const texCache = useRef<Record<string, THREE.Texture>>({});
  const loadTex = (url: string, srgb: boolean) => {
    const cache = texCache.current;
    if (!cache[url]) {
      const t = new THREE.TextureLoader().load(url);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      cache[url] = t;
    }
    return cache[url];
  };

  // Apply the selected base map to the globe material. Terrain mode DISPLACES the
  // sphere geometry (real relief) using the topology heightmap; the globe uses a
  // finer tessellation in that mode (globeCurvatureResolution below).
  useEffect(() => {
    const m = globeMaterial;
    m.map = null;
    m.bumpMap = null;
    m.emissiveMap = null;
    m.displacementMap = null;
    m.bumpScale = 0;
    m.displacementScale = 0;
    m.emissive.set("#000000");
    m.color.set("#ffffff");
    if (baseMap === "political") {
      m.color.set("#0a1526"); // dark ocean, choropleth countries on top
    } else if (baseMap === "terrain") {
      const topo = loadTex(topologyUrl, false);
      m.map = loadTex(dayUrl, true);
      m.bumpMap = topo;
      m.bumpScale = 4;
      m.displacementMap = topo; // real geometric relief (mountains stick out)
      m.displacementScale = reliefScale;
    } else if (baseMap === "hydro") {
      m.map = loadTex(waterUrl, true); // water mask: oceans/lakes bright
      m.color.set("#2f6fd0"); // tint water blue; land reads dark
      m.emissive.set("#0a1626"); // keep land from going pure black
      m.bumpMap = loadTex(topologyUrl, false);
      m.bumpScale = 3;
    }
    // satellite / night / agora are rendered by the day-night ShaderMaterial below.
    m.needsUpdate = true;
  }, [baseMap, globeMaterial, reliefScale]);

  // Day/night/cloud ShaderMaterial for satellite, night and "agora" modes — applied
  // to globe.gl's OWN globe object, so it reuses that geometry/UV/transform and
  // stays perfectly aligned with the countries.
  const dayNightMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: null },
          nightTexture: { value: null },
          cloudTexture: { value: null },
          sunDir: { value: new THREE.Vector3(1, 0, 0) },
          mode: { value: 0 }, // 0 = satellite (day), 1 = night, 2 = agora (day/night by sun)
          cloudsOn: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform sampler2D dayTexture;
          uniform sampler2D nightTexture;
          uniform sampler2D cloudTexture;
          uniform vec3 sunDir;
          uniform float mode;
          uniform float cloudsOn;
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            float dayAmt;
            if (mode < 0.5) dayAmt = 1.0;
            else if (mode < 1.5) dayAmt = 0.0;
            else dayAmt = smoothstep(-0.10, 0.10, dot(normalize(vWorldPos), normalize(sunDir)));
            vec3 day = texture2D(dayTexture, vUv).rgb;
            vec3 night = texture2D(nightTexture, vUv).rgb;
            vec3 col = mix(night, day, dayAmt);
            if (cloudsOn > 0.5) {
              float c = clamp(texture2D(cloudTexture, vUv).r, 0.0, 1.0);
              vec3 cloudCol = vec3(max(dayAmt, 0.12)); // lit on the day side, dim at night
              col = mix(col, cloudCol, c * 0.85);
            }
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );

  const activeMaterial = SHADER_MODES.includes(baseMap) ? dayNightMaterial : globeMaterial;

  // Load day/night into the shader + set its mode when a shader base map is active.
  useEffect(() => {
    if (!SHADER_MODES.includes(baseMap)) return;
    const u = dayNightMaterial.uniforms;
    u.dayTexture.value = loadTex(dayUrl, false);
    u.nightTexture.value = loadTex(nightUrl, false);
    u.mode.value = baseMap === "satellite" ? 0 : baseMap === "night" ? 1 : 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMap, dayNightMaterial]);

  // "Agora": point the sun at the current subsolar point and refresh each minute.
  useEffect(() => {
    if (baseMap !== "agora" || size.w === 0) return;
    const globe = globeEl.current;
    if (!globe) return;
    const update = () => {
      dayNightMaterial.uniforms.sunDir.value.copy(sunDirectionNow(globe));
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [baseMap, dayNightMaterial, size.w]);

  // Clouds: fetch the near-real-time composite at runtime (only when the layer is
  // on and a shader base map is active); graceful no-op offline.
  const cloudTexRef = useRef<THREE.Texture | null>(null);
  useEffect(() => {
    const want = layers.clouds && SHADER_MODES.includes(baseMap);
    const u = dayNightMaterial.uniforms;
    if (!want) {
      u.cloudsOn.value = 0;
      return;
    }
    if (cloudTexRef.current) {
      u.cloudTexture.value = cloudTexRef.current;
      u.cloudsOn.value = 1;
      return;
    }
    new THREE.TextureLoader().load(
      CLOUDS_URL,
      (tex) => {
        cloudTexRef.current = tex;
        u.cloudTexture.value = tex;
        u.cloudsOn.value = 1;
      },
      undefined,
      () => { u.cloudsOn.value = 0; }, // offline / blocked: no clouds
    );
  }, [layers.clouds, baseMap, dayNightMaterial]);

  // Sky layer: procedural starfield + Sun (at the real solar direction) + Moon (at
  // its real position). Added straight to the scene; positions refresh each minute.
  useEffect(() => {
    if (!layers.sky || size.w === 0) return;
    const globe = globeEl.current;
    if (!globe) return;
    const scene = globe.scene();
    const cam = globe.camera() as THREE.PerspectiveCamera;
    const prevFar = cam.far;
    if (cam.far < 30000) { cam.far = 30000; cam.updateProjectionMatrix(); }

    // Starfield: random points on a far sphere, constant on-screen size, with a
    // little brightness variation so it doesn't read as a uniform grid.
    const STAR_N = 3800, STAR_R = 9000;
    const pos = new Float32Array(STAR_N * 3);
    const col = new Float32Array(STAR_N * 3);
    for (let k = 0; k < STAR_N; k++) {
      const uu = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - uu * uu);
      pos.set([STAR_R * s * Math.cos(th), STAR_R * uu, STAR_R * s * Math.sin(th)], k * 3);
      const b = 0.5 + Math.random() * 0.5; // brightness
      const warm = Math.random() < 0.15; // a few warm/blue tints
      col.set([b, b * (warm ? 0.95 : 1), b * (warm ? 0.88 : 1)], k * 3);
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    starGeom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(starGeom, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true }));
    stars.frustumCulled = false;

    // Sun: a small bright disk + a soft additive corona sprite (realistic glow).
    const sunCore = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 32), new THREE.MeshBasicMaterial({ color: 0xfff6de }));
    const glowTex = makeGlowTexture();
    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    sunGlow.scale.set(650, 650, 1);

    // Moon: real lunar surface, lit ONLY from the Sun's direction so it shows the
    // correct PHASE. Render layer 1 isolates its lighting from the globe's lights.
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(42, 48, 48),
      new THREE.MeshStandardMaterial({ map: loadTex(moonUrl, true), roughness: 1, metalness: 0 }),
    );
    moon.layers.set(1);
    const moonLight = new THREE.DirectionalLight(0xfff6ea, 2.8);
    moonLight.layers.set(1);
    const moonFill = new THREE.AmbientLight(0x151a2b, 1.0); // faint earthshine on the dark limb
    moonFill.layers.set(1);
    cam.layers.enable(1);

    scene.add(stars, sunCore, sunGlow, moon, moonLight, moonFill);

    const place = () => {
      const s = sunDirectionNow(globe);
      sunCore.position.copy(s).multiplyScalar(6500);
      sunGlow.position.copy(sunCore.position);
      moonLight.position.copy(s); // parallel light arriving from the Sun
      moon.position.copy(moonDirectionNow(globe)).multiplyScalar(5200);
    };
    place();
    const id = setInterval(place, 60000);

    return () => {
      clearInterval(id);
      cam.layers.disable(1);
      scene.remove(stars, sunCore, sunGlow, moon, moonLight, moonFill);
      starGeom.dispose();
      glowTex.dispose();
      (stars.material as THREE.Material).dispose();
      (sunGlow.material as THREE.Material).dispose();
      for (const obj of [sunCore, moon]) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
      if (cam.far !== prevFar) { cam.far = prevFar; cam.updateProjectionMatrix(); }
    };
  }, [layers.sky, size.w]);

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
    if (layers.rivers || baseMap === "hydro") out.push(...RIVER_PATHS);
    return out;
  }, [allPaths, selected, layers, scope, baseMap]);

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
          globeMaterial={activeMaterial}
          // Fine sphere tessellation in terrain mode so the displacement map
          // renders smooth mountains (default 4 → coarse; 1 → 360×180 segments).
          globeCurvatureResolution={baseMap === "terrain" ? 1 : 4}
          showAtmosphere
          atmosphereColor="#3a6ea5"
          atmosphereAltitude={0.18}
          // --- Countries ---
          polygonsData={COUNTRY_FEATURES}
          polygonsTransitionDuration={0}
          polygonCapColor={(f: object) => {
            const feat = f as CountryFeature;
            // Over a textured base map, keep country fills transparent so the
            // earth surface shows; only tint the selected country.
            if (baseMap !== "political") {
              const iso = g20Datum(feat)?.iso ?? featureIso(feat);
              return selectedIsos.includes(iso) ? "rgba(56,189,248,0.28)" : "rgba(0,0,0,0)";
            }
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
          // Over a base map, lay polygons nearly flush so terrain isn't occluded.
          polygonAltitude={(f: object) =>
            baseMap !== "political" ? 0.002 : g20Datum(f as CountryFeature) ? 0.02 : 0.006
          }
          polygonLabel={(f: object) => {
            const feat = f as CountryFeature;
            const d = g20Datum(feat);
            if (!d) {
              const nm = countryName(featureIso(feat), lang, feat.properties.name);
              return `<div style="color:#94a3b8">${nm}</div>`;
            }
            const nm = countryName(d.iso, lang, d.name);
            const c = byIso[d.iso];
            if (!c) return `<b>${nm}</b>`;
            return `
              <div style="font-family:system-ui;background:#0d1626;border:1px solid #22314f;padding:8px 10px;border-radius:8px;color:#e7ecf5">
                <b>${nm}</b>${c.inCrisis ? ` <span style="color:#f87171">⚠ ${t("common.inCrisis")}</span>` : ""}<br/>
                ${t("stat.gdp")}: $${c.gdp.toFixed(2)} ${t("unit.tri")}<br/>
                ${t("stat.population")}: ${formatPop(c.population, t)}<br/>
                ${t("stat.growth")}: ${c.gdpGrowthAnn.toFixed(1)}%<br/>
                ${t("stat.inflation")}: ${c.inflationAnn.toFixed(1)}%<br/>
                ${t("stat.unemployment")}: ${c.unemployment.toFixed(1)}%<br/>
                ${t("metric.approval")}: ${c.approval.toFixed(0)}/100
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
