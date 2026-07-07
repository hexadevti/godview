// Cloudflare Worker — live-flights proxy for the zoom-in tier of the aviation
// layer. The free flight feeds (OpenSky, adsb.lol) don't send permissive CORS
// headers, so the browser can't call them directly; this relays the request
// server-side, transforms the payload into the app's compact schema, and caches
// it briefly to stay well under the source's rate limits (avoiding blocks).
//
// The client (src/globe/GlobeView.tsx) calls it as:
//   GET /api/flights?lamin=&lomin=&lamax=&lomax=
// and expects: { flights: [[lat, lng, trackDeg, velMs, altKm], ...] }
//
// ── Wiring it up ────────────────────────────────────────────────────────────
// This repo deploys as Cloudflare Workers Static Assets. To add this endpoint,
// make the Worker the entry and bind the built assets, e.g. in wrangler.jsonc:
//   {
//     "name": "godview",
//     "main": "worker/flights.mjs",
//     "compatibility_date": "2024-11-01",
//     "assets": { "directory": "./dist", "binding": "ASSETS" }
//   }
// Then set VITE_FLIGHTS_PROXY=/api/flights in the build env and redeploy.
// Everything that is not /api/flights falls through to the static site.

const UPSTREAM = "https://opensky-network.org/api/states/all";
const CACHE_TTL = 15; // seconds — one upstream hit is shared across viewers

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/flights") {
      // Not our route → serve the static site (Static Assets binding).
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    }

    const p = url.searchParams;
    const bbox = ["lamin", "lomin", "lamax", "lomax"].map((k) => p.get(k));
    if (bbox.some((v) => v == null || Number.isNaN(Number(v)))) {
      return json({ error: "missing/invalid bbox" }, 400);
    }

    // Edge cache keyed by the (rounded) bbox so nearby viewports share a hit.
    const cache = caches.default;
    const cacheKey = new Request(`https://flights.cache/${bbox.join(",")}`, request);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const upstream = `${UPSTREAM}?lamin=${bbox[0]}&lomin=${bbox[1]}&lamax=${bbox[2]}&lomax=${bbox[3]}`;
    let flights = [];
    try {
      const res = await fetch(upstream, {
        // If you have OpenSky OAuth2 client credentials, add an Authorization
        // header here (fetch a token from env.OPENSKY_CLIENT_ID/SECRET) to raise
        // the rate limit. Anonymous works for light use.
        headers: { "User-Agent": "godview-flights/1.0" },
        cf: { cacheTtl: CACHE_TTL },
      });
      if (res.ok) {
        const data = await res.json();
        // OpenSky state vector: [5]lon [6]lat [7]baroAlt(m) [8]onGround [9]vel(m/s) [10]track
        flights = (data.states || [])
          .filter((s) => s[5] != null && s[6] != null && s[8] === false)
          .map((s) => [
            Math.round(s[6] * 100) / 100,
            Math.round(s[5] * 100) / 100,
            Math.round(s[10] ?? 0),
            Math.round(s[9] ?? 0),
            Math.round(((s[7] ?? 0) / 1000) * 10) / 10,
          ]);
      }
    } catch {
      /* fall through with empty list — client keeps the ambient snapshot */
    }

    const response = json({ flights }, 200);
    response.headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  },
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}
