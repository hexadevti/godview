// Shared auto-network topology for a country's internal road/rail: which city
// pairs to connect. Used by BOTH the app (routes.ts buildAuto) and the offline
// road-geometry ingest (scripts/ingest-roads.mjs), so the OSRM keys they produce
// and look up line up exactly. Self-contained (own haversine) so the Node ingest
// script can import it without pulling three.js/geo.

export interface NetCity {
  name: string;
  lat: number;
  lng: number;
}

function km(a: NetCity, b: NetCity): number {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Auto internal network as index pairs into `cities`:
 *  road = each city to its 2 nearest (deduped); rail = nearest-neighbour trunk. */
export function autoEdges(cities: NetCity[]): { road: [number, number][]; rail: [number, number][] } {
  const road: [number, number][] = [];
  const rail: [number, number][] = [];
  if (cities.length < 2) return { road, rail };

  const dist = (a: number, b: number) => km(cities[a], cities[b]);
  const seen = new Set<string>();
  for (let i = 0; i < cities.length; i++) {
    const order = cities.map((_, j) => j).filter((j) => j !== i).sort((x, y) => dist(i, x) - dist(i, y));
    for (const j of order.slice(0, 2)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      road.push([i, j]);
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
      if (d < bd) { bd = d; best = j; }
    }
    rail.push([cur, best]);
    visited.add(best);
    cur = best;
  }
  return { road, rail };
}

/** The OSRM key for a city pair (order-independent lookup should try both). */
export function edgeKey(iso: number, a: NetCity, b: NetCity): string {
  return `${iso}:${a.name}>${b.name}`;
}
