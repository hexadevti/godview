// Loads world country polygons (Natural Earth 110m via the `world-atlas`
// package) and converts the bundled TopoJSON to GeoJSON features for
// react-globe.gl's `.polygonsData()`.

import { feature } from "topojson-client";
// The JSON ships with the world-atlas package; bundled at build time (offline).
import worldTopo from "world-atlas/countries-110m.json";

export interface CountryFeature {
  type: "Feature";
  id?: string | number;
  properties: { name: string; [k: string]: unknown };
  geometry: unknown;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const topo = worldTopo as any;
const fc = feature(topo, topo.objects.countries) as any;

/** All world countries as GeoJSON features (ocean/background handled by globe). */
export const COUNTRY_FEATURES: CountryFeature[] = fc.features;

/** ISO 3166-1 numeric for a feature, or NaN if the source lacks it. */
export function featureIso(f: CountryFeature): number {
  return Number(f.id);
}
