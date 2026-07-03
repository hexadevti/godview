// Real coordinates of each G20 country's primary economic hub / largest city,
// used as the endpoints for the animated AIR routes (great-circle between
// cities). Sea routes use real ports, defined per-lane in seaLanes.ts.

export interface Hub {
  lat: number;
  lng: number;
  city: string;
}

export const HUBS: Record<number, Hub> = {
  32: { lat: -34.61, lng: -58.38, city: "Buenos Aires" },
  36: { lat: -33.87, lng: 151.21, city: "Sydney" },
  76: { lat: -23.55, lng: -46.63, city: "São Paulo" },
  124: { lat: 43.65, lng: -79.38, city: "Toronto" },
  156: { lat: 31.23, lng: 121.47, city: "Shanghai" },
  250: { lat: 48.86, lng: 2.35, city: "Paris" },
  276: { lat: 50.11, lng: 8.68, city: "Frankfurt" },
  356: { lat: 19.08, lng: 72.88, city: "Mumbai" },
  360: { lat: -6.21, lng: 106.85, city: "Jakarta" },
  380: { lat: 45.46, lng: 9.19, city: "Milan" },
  392: { lat: 35.68, lng: 139.69, city: "Tokyo" },
  484: { lat: 19.43, lng: -99.13, city: "Mexico City" },
  643: { lat: 55.75, lng: 37.62, city: "Moscow" },
  682: { lat: 24.71, lng: 46.68, city: "Riyadh" },
  710: { lat: -26.2, lng: 28.05, city: "Johannesburg" },
  410: { lat: 37.57, lng: 126.98, city: "Seoul" },
  792: { lat: 41.01, lng: 28.98, city: "Istanbul" },
  826: { lat: 51.51, lng: -0.13, city: "London" },
  840: { lat: 40.71, lng: -74.01, city: "New York" },
};
