// Localized country names (en/pt/es) keyed by ISO 3166-1 numeric, sourced from
// the offline `world-countries` dataset. Used so the globe hover card, the
// country inspector and the world table show names in the active language
// instead of the Portuguese names baked into the simulation data.

import countries from "world-countries";
import type { Lang } from "./i18n";

const NAMES: Record<number, Record<Lang, string>> = {};
for (const c of countries) {
  const iso = Number(c.ccn3);
  if (!iso) continue;
  const en = c.name.common;
  NAMES[iso] = {
    en,
    pt: c.translations.por?.common ?? en,
    es: c.translations.spa?.common ?? en,
  };
}

/** Localized common name for a numeric ISO, falling back to `fallback` (the raw
 *  dataset name) when the country isn't in the world-countries table. */
export function countryName(iso: number, lang: Lang, fallback = ""): string {
  return NAMES[iso]?.[lang] ?? fallback;
}
