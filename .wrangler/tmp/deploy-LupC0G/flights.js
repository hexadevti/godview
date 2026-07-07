var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/flights.mjs
var UPSTREAM = "https://opensky-network.org/api/states/all";
var CACHE_TTL = 15;
var flights_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/flights") {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    }
    const p = url.searchParams;
    const bbox = ["lamin", "lomin", "lamax", "lomax"].map((k) => p.get(k));
    if (bbox.some((v) => v == null || Number.isNaN(Number(v)))) {
      return json({ error: "missing/invalid bbox" }, 400);
    }
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
        cf: { cacheTtl: CACHE_TTL }
      });
      if (res.ok) {
        const data = await res.json();
        flights = (data.states || []).filter((s) => s[5] != null && s[6] != null && s[8] === false).map((s) => [
          Math.round(s[6] * 100) / 100,
          Math.round(s[5] * 100) / 100,
          Math.round(s[10] ?? 0),
          Math.round(s[9] ?? 0),
          Math.round((s[7] ?? 0) / 1e3 * 10) / 10
        ]);
      }
    } catch {
    }
    const response = json({ flights }, 200);
    response.headers.set("Cache-Control", `public, max-age=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  }
};
function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
}
__name(json, "json");
export {
  flights_default as default
};
//# sourceMappingURL=flights.js.map
