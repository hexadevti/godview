// Builds the air and sea routes (dense point lists + cumulative lengths) and
// the moving vehicles that travel along them.

import { AIRPORTS } from "../data/airports";
import { CITIES, type City } from "../data/cities";
import { CORRIDORS } from "../data/landCorridors";
import { SEA_LANES } from "../data/seaLanes";
import { TRADE_FLOWS } from "../data/trade";
import { cumulative, densify, greatCircle, haversine, type LatLng } from "./geo";

// air/sea = international; road/rail = internal (only shown for the selected country).
export type RouteKind = "air" | "sea" | "road" | "rail";

export interface Route {
  kind: RouteKind;
  from: number;
  to: number;
  value: number;
  points: LatLng[];
  cum: number[];
  lengthKm: number;
}

function makeRoute(kind: RouteKind, from: number, to: number, value: number, points: LatLng[]): Route {
  const cum = cumulative(points);
  return { kind, from, to, value, points, cum, lengthKm: cum[cum.length - 1] };
}

function buildRoutes(): Route[] {
  const routes: Route[] = [];

  // Air: fan out from up to 3 real airports per origin country, each connecting
  // to the geographically nearest airport in the destination country. The flow
  // value is split across those parallel corridors.
  const airFlows = [...TRADE_FLOWS]
    .filter((f) => AIRPORTS[f.from] && AIRPORTS[f.to] && f.value >= 40)
    .sort((a, b) => b.value - a.value)
    .slice(0, 48);
  for (const f of airFlows) {
    const origins = AIRPORTS[f.from].slice(0, 4);
    const dests = AIRPORTS[f.to];
    const perValue = f.value / origins.length;
    for (const o of origins) {
      let best = dests[0];
      let bestDist = Infinity;
      for (const d of dests) {
        const dist = haversine(o[0], o[1], d[0], d[1]);
        if (dist < bestDist) {
          bestDist = dist;
          best = d;
        }
      }
      routes.push(makeRoute("air", f.from, f.to, perValue, greatCircle(o[0], o[1], best[0], best[1], 48)));
    }
  }

  // Sea: curated corridors through real chokepoints.
  for (const lane of SEA_LANES) {
    routes.push(makeRoute("sea", lane.from, lane.to, lane.value, densify(lane.waypoints, 300)));
  }

  // Internal road & rail networks per country (from/to = same iso).
  for (const [isoStr, cities] of Object.entries(CITIES)) {
    routes.push(...buildInternal(Number(isoStr), cities));
  }

  return routes;
}

/** Internal road & rail network for a country: curated real corridors when
 *  available (landCorridors.ts), else an auto-generated city network. */
function buildInternal(iso: number, cities: City[]): Route[] {
  if (cities.length < 2) return [];
  const corridors = CORRIDORS[iso];
  return corridors ? buildCorridors(iso, cities, corridors) : buildAuto(iso, cities);
}

/** Turn ordered city-name sequences into multi-segment routes (real corridors),
 *  then add road "spurs" so any city not on a corridor still connects. */
function buildCorridors(iso: number, cities: City[], c: { road: string[][]; rail: string[][] }): Route[] {
  const byName = new Map(cities.map((city) => [city.name, city]));
  const build = (kind: RouteKind, seqs: string[][]) =>
    seqs
      .map((names) => names.map((n) => byName.get(n)).filter((x): x is City => !!x))
      .filter((pts) => pts.length >= 2)
      .map((pts) => makeRoute(kind, iso, iso, 0, densify(pts.map((p) => [p.lat, p.lng] as LatLng), 120)));
  const routes = [...build("road", c.road), ...build("rail", c.rail)];

  const covered = new Set([...c.road.flat(), ...c.rail.flat()]);
  const hubs = cities.filter((ci) => covered.has(ci.name));
  for (const city of cities) {
    if (covered.has(city.name) || hubs.length === 0) continue;
    let best = hubs[0];
    let bd = Infinity;
    for (const h of hubs) {
      const d = haversine(city.lat, city.lng, h.lat, h.lng);
      if (d < bd) { bd = d; best = h; }
    }
    routes.push(makeRoute("road", iso, iso, 0, densify([[city.lat, city.lng], [best.lat, best.lng]], 120)));
  }
  return routes;
}

/** Fallback: road = each city to its 2 nearest; rail = trunk chain through all. */
function buildAuto(iso: number, cities: City[]): Route[] {
  const out: Route[] = [];
  const dist = (a: number, b: number) => haversine(cities[a].lat, cities[a].lng, cities[b].lat, cities[b].lng);
  const link = (kind: RouteKind, a: number, b: number) =>
    makeRoute(kind, iso, iso, 0, greatCircle(cities[a].lat, cities[a].lng, cities[b].lat, cities[b].lng, 14));

  const seen = new Set<string>();
  for (let i = 0; i < cities.length; i++) {
    const order = cities.map((_, j) => j).filter((j) => j !== i).sort((x, y) => dist(i, x) - dist(i, y));
    for (const j of order.slice(0, 2)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(link("road", i, j));
    }
  }

  const visited = new Set([0]);
  let cur = 0;
  while (visited.size < cities.length) {
    let best = -1;
    let bd = Infinity;
    for (let j = 0; j < cities.length; j++) {
      if (visited.has(j)) continue;
      const d = dist(cur, j);
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    out.push(link("rail", cur, best));
    visited.add(best);
    cur = best;
  }
  return out;
}

export const ROUTES: Route[] = buildRoutes();

/** Altitude (in globe radii) of a point at fraction t along a route. */
export function routeAltitude(kind: RouteKind, t: number): number {
  // Air arches low over the globe; sea hugs the ocean surface. Road/rail must
  // sit ABOVE the extruded country cap (0.02) or they'd be hidden under it.
  if (kind === "air") return 0.01 + 0.045 * Math.sin(Math.PI * t);
  if (kind === "road") return 0.026;
  if (kind === "rail") return 0.023;
  return 0.006; // sea
}

export interface Vehicle {
  routeIndex: number;
  kind: RouteKind;
  t: number; // current fraction along the route
  tPerSec: number; // speed in fraction/second (planes faster than ships)
}

// Vehicles are spaced by DISTANCE along the route (roughly constant km apart),
// so short routes don't bunch up. Busier routes (higher trade value) get a
// tighter spacing = more vehicles; light routes get a trickle. This matches the
// real flow of the route rather than a fixed count per route.
const MAX_PER_ROUTE = 10;
const MIN_SPACING_KM = 1400; // busiest routes: a vehicle roughly every 1400 km
const MAX_SPACING_KM = 6500; // lightest routes: one every ~6500 km (short → 1)
const SPACING_BASE = 250000; // spacingKm = SPACING_BASE / value, then clamped

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function buildVehicles(): Vehicle[] {
  const vehicles: Vehicle[] = [];
  ROUTES.forEach((r, routeIndex) => {
    let count: number;
    let groundKmPerSec: number;
    if (r.kind === "road" || r.kind === "rail") {
      count = Math.max(1, Math.min(6, Math.round(r.lengthKm / 700))); // more on longer corridors
      groundKmPerSec = r.kind === "road" ? 80 : 110;
    } else {
      const spacingKm = clampN(SPACING_BASE / r.value, MIN_SPACING_KM, MAX_SPACING_KM);
      count = Math.max(1, Math.min(MAX_PER_ROUTE, Math.round(r.lengthKm / spacingKm)));
      groundKmPerSec = r.kind === "air" ? 380 : 160; // slower, visual pace (not real)
    }
    const tPerSec = groundKmPerSec / r.lengthKm;
    for (let i = 0; i < count; i++) {
      vehicles.push({ routeIndex, kind: r.kind, t: i / count, tPerSec });
    }
  });
  return vehicles;
}
