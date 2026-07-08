// Builds the air and sea routes (dense point lists + cumulative lengths) and
// the moving vehicles that travel along them.

import { ALL_CITY_ISOS, citiesFor } from "../data/allCities";
import { type City } from "../data/cities";
import { autoEdges, edgeKey } from "../data/internalNet";
import { CORRIDORS } from "../data/landCorridors";
import airData from "../data/generated/air-routes.json";
import roadData from "../data/generated/road-routes.json";
import { SEA_LANES } from "../data/seaLanes";
import { cumulative, densify, greatCircle, haversine, type LatLng } from "./geo";

// Real driving geometry per land corridor (OSRM), keyed "iso:CityA>CityB".
const ROAD_ROUTES = (roadData as unknown as { routes: Record<string, LatLng[]> }).routes;

// Real airport-pair connectivity (OpenFlights), weighted by Comtrade trade.
interface AirRoute { from: number; to: number; value: number; a: [number, number]; b: [number, number] }
const AIR_DATA = airData as unknown as { routes: AirRoute[]; airports?: [number, number][] };
const AIR_ROUTES = AIR_DATA.routes;

/** Every mappable airport worldwide (OpenFlights), as [lat, lng] pairs — for the
 *  "all airports" dot layer on the globe. */
export const AIRPORTS: [number, number][] = AIR_DATA.airports ?? [];

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

  // Air: real airport-pair connectivity (OpenFlights), geodesic geometry.
  for (const a of AIR_ROUTES) {
    routes.push(makeRoute("air", a.from, a.to, a.value, greatCircle(a.a[0], a.a[1], a.b[0], a.b[1], 48)));
  }

  // Sea: curated corridors through real chokepoints.
  for (const lane of SEA_LANES) {
    routes.push(makeRoute("sea", lane.from, lane.to, lane.value, densify(lane.waypoints, 300)));
  }

  // Internal road & rail networks for EVERY country (from/to = same iso). The
  // G20 use curated real corridors; the rest auto-build from their top cities.
  for (const iso of ALL_CITY_ISOS) {
    routes.push(...buildInternal(iso, citiesFor(iso)));
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
      .map((names) => {
        const pts = names.map((n) => byName.get(n)).filter((x): x is City => !!x);
        if (pts.length < 2) return null;
        // Real driving geometry (road; rail approximated by road path); great
        // circle if this corridor wasn't routable.
        const real = ROAD_ROUTES[`${iso}:${names.join(">")}`];
        const waypoints = real && real.length >= 2 ? real : densify(pts.map((p) => [p.lat, p.lng] as LatLng), 120);
        return makeRoute(kind, iso, iso, 0, waypoints);
      })
      .filter((r): r is Route => r !== null);
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

/** Auto network (non-corridor countries): road = each city to its 2 nearest,
 *  rail = trunk chain through all. Uses REAL OSRM driving geometry where the
 *  roads ingest produced it (keyed by city pair), else a great-circle link. */
function buildAuto(iso: number, cities: City[]): Route[] {
  const { road, rail } = autoEdges(cities);
  const link = (kind: RouteKind, a: number, b: number) => {
    const A = cities[a], B = cities[b];
    const real = ROAD_ROUTES[edgeKey(iso, A, B)] ?? ROAD_ROUTES[edgeKey(iso, B, A)];
    const pts = real && real.length >= 2 ? real : greatCircle(A.lat, A.lng, B.lat, B.lng, 14);
    return makeRoute(kind, iso, iso, 0, pts);
  };
  return [
    ...road.map(([a, b]) => link("road", a, b)),
    ...rail.map(([a, b]) => link("rail", a, b)),
  ];
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

export function buildVehicles(routes: Route[] = ROUTES): Vehicle[] {
  const vehicles: Vehicle[] = [];
  routes.forEach((r, routeIndex) => {
    let count: number;
    let groundKmPerSec: number;
    if (r.kind === "road" || r.kind === "rail") {
      count = Math.max(1, Math.min(6, Math.round(r.lengthKm / 700))); // more on longer corridors
      groundKmPerSec = r.kind === "road" ? 80 : 110;
    } else {
      const spacingKm = clampN(SPACING_BASE / r.value, MIN_SPACING_KM, MAX_SPACING_KM);
      const scaled = Math.min(MAX_PER_ROUTE, Math.round(r.lengthKm / spacingKm));
      // Fewer planes on short air routes: hops under ~1200 km get NO plane (the
      // arc + airports still draw); longer routes keep a length-scaled count, so
      // busy long hauls get more. Sea lanes always keep at least one.
      count = r.kind === "air" ? (r.lengthKm < 1200 ? 0 : Math.max(1, scaled)) : Math.max(1, scaled);
      groundKmPerSec = r.kind === "air" ? 380 : 160; // slower, visual pace (not real)
    }
    const tPerSec = groundKmPerSec / r.lengthKm;
    for (let i = 0; i < count; i++) {
      vehicles.push({ routeIndex, kind: r.kind, t: i / count, tPerSec });
    }
  });
  return vehicles;
}
