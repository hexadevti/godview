// Spherical geometry helpers for building and sampling routes on the globe.

export type LatLng = [number, number];

const R = 6371; // km
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in km. */
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const la1 = toRad(aLat);
  const la2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Interpolate along the great circle between two points (slerp), fraction f. */
export function interpGC(aLat: number, aLng: number, bLat: number, bLng: number, f: number): LatLng {
  const p1 = toRad(aLat), l1 = toRad(aLng);
  const p2 = toRad(bLat), l2 = toRad(bLng);
  const d = 2 * Math.asin(
    Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2),
  );
  if (d === 0) return [aLat, aLng];
  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return [toDeg(Math.atan2(z, Math.hypot(x, y))), toDeg(Math.atan2(y, x))];
}

/** Sample a great-circle arc into n+1 points. */
export function greatCircle(aLat: number, aLng: number, bLat: number, bLng: number, n: number): LatLng[] {
  const pts: LatLng[] = [];
  for (let i = 0; i <= n; i++) pts.push(interpGC(aLat, aLng, bLat, bLng, i / n));
  return pts;
}

/** Densify a waypoint polyline into ~segKm-spaced points via per-segment slerp. */
export function densify(waypoints: LatLng[], segKm = 300): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [aLat, aLng] = waypoints[i];
    const [bLat, bLng] = waypoints[i + 1];
    const steps = Math.max(1, Math.round(haversine(aLat, aLng, bLat, bLng) / segKm));
    for (let s = 0; s < steps; s++) out.push(interpGC(aLat, aLng, bLat, bLng, s / steps));
  }
  out.push(waypoints[waypoints.length - 1]);
  return out;
}

/** Cumulative arc length (km) along a point list; cum[0] = 0. */
export function cumulative(points: LatLng[]): number[] {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  }
  return cum;
}

export interface SamplePoint {
  lat: number;
  lng: number;
  aheadLat: number; // a point slightly further along, for heading
  aheadLng: number;
}

/** Position at fraction t (0..1) along a dense point list, plus a look-ahead. */
export function sampleAt(points: LatLng[], cum: number[], t: number): SamplePoint {
  const total = cum[cum.length - 1] || 1;
  const target = Math.min(1, Math.max(0, t)) * total;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const segLen = cum[i] - cum[i - 1] || 1;
  const f = (target - cum[i - 1]) / segLen;
  const [lat, lng] = interpGC(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], f);
  // Look-ahead: a bit further along the same segment (or the segment end).
  const [aheadLat, aheadLng] = interpGC(
    points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], Math.min(1, f + 0.15),
  );
  return { lat, lng, aheadLat, aheadLng };
}
