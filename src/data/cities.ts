// Major real cities per G20 country — nodes of each country's INTERNAL road &
// rail network, and the labelled/pointed markers shown when the country is
// selected.

export interface City {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: Record<number, City[]> = {
  32: [
    { name: "Buenos Aires", lat: -34.61, lng: -58.38 }, { name: "Córdoba", lat: -31.42, lng: -64.19 },
    { name: "Rosario", lat: -32.95, lng: -60.66 }, { name: "Mendoza", lat: -32.89, lng: -68.84 },
    { name: "La Plata", lat: -34.92, lng: -57.95 }, { name: "Mar del Plata", lat: -38.0, lng: -57.55 },
    { name: "Tucumán", lat: -26.82, lng: -65.22 }, { name: "Salta", lat: -24.79, lng: -65.41 },
  ],
  36: [
    { name: "Sydney", lat: -33.87, lng: 151.21 }, { name: "Melbourne", lat: -37.81, lng: 144.96 },
    { name: "Brisbane", lat: -27.47, lng: 153.03 }, { name: "Perth", lat: -31.95, lng: 115.86 },
    { name: "Adelaide", lat: -34.93, lng: 138.6 }, { name: "Canberra", lat: -35.28, lng: 149.13 },
    { name: "Gold Coast", lat: -28.02, lng: 153.4 }, { name: "Darwin", lat: -12.46, lng: 130.84 },
    { name: "Hobart", lat: -42.88, lng: 147.33 },
  ],
  76: [
    { name: "São Paulo", lat: -23.55, lng: -46.63 }, { name: "Rio de Janeiro", lat: -22.91, lng: -43.17 },
    { name: "Brasília", lat: -15.79, lng: -47.88 }, { name: "Belo Horizonte", lat: -19.92, lng: -43.94 },
    { name: "Salvador", lat: -12.97, lng: -38.51 }, { name: "Porto Alegre", lat: -30.03, lng: -51.23 },
    { name: "Fortaleza", lat: -3.73, lng: -38.52 }, { name: "Recife", lat: -8.05, lng: -34.88 },
    { name: "Curitiba", lat: -25.43, lng: -49.27 }, { name: "Manaus", lat: -3.12, lng: -60.02 },
    { name: "Belém", lat: -1.46, lng: -48.49 },
  ],
  124: [
    { name: "Toronto", lat: 43.65, lng: -79.38 }, { name: "Montréal", lat: 45.5, lng: -73.57 },
    { name: "Vancouver", lat: 49.28, lng: -123.12 }, { name: "Calgary", lat: 51.05, lng: -114.07 },
    { name: "Winnipeg", lat: 49.9, lng: -97.14 }, { name: "Ottawa", lat: 45.42, lng: -75.7 },
    { name: "Edmonton", lat: 53.55, lng: -113.49 }, { name: "Halifax", lat: 44.65, lng: -63.58 },
    { name: "Québec", lat: 46.81, lng: -71.21 },
  ],
  156: [
    { name: "Beijing", lat: 39.9, lng: 116.41 }, { name: "Shanghai", lat: 31.23, lng: 121.47 },
    { name: "Guangzhou", lat: 23.13, lng: 113.26 }, { name: "Chengdu", lat: 30.57, lng: 104.07 },
    { name: "Wuhan", lat: 30.59, lng: 114.31 }, { name: "Xi'an", lat: 34.34, lng: 108.94 },
    { name: "Shenzhen", lat: 22.54, lng: 114.06 }, { name: "Chongqing", lat: 29.56, lng: 106.55 },
    { name: "Tianjin", lat: 39.13, lng: 117.2 }, { name: "Nanjing", lat: 32.06, lng: 118.8 },
    { name: "Shenyang", lat: 41.8, lng: 123.43 }, { name: "Hangzhou", lat: 30.27, lng: 120.15 },
  ],
  250: [
    { name: "Paris", lat: 48.86, lng: 2.35 }, { name: "Lyon", lat: 45.76, lng: 4.84 },
    { name: "Marseille", lat: 43.3, lng: 5.37 }, { name: "Toulouse", lat: 43.6, lng: 1.44 },
    { name: "Bordeaux", lat: 44.84, lng: -0.58 }, { name: "Lille", lat: 50.63, lng: 3.06 },
    { name: "Nice", lat: 43.7, lng: 7.27 }, { name: "Nantes", lat: 47.22, lng: -1.55 },
    { name: "Strasbourg", lat: 48.58, lng: 7.75 },
  ],
  276: [
    { name: "Berlin", lat: 52.52, lng: 13.4 }, { name: "München", lat: 48.14, lng: 11.58 },
    { name: "Frankfurt", lat: 50.11, lng: 8.68 }, { name: "Hamburg", lat: 53.55, lng: 9.99 },
    { name: "Köln", lat: 50.94, lng: 6.96 }, { name: "Stuttgart", lat: 48.78, lng: 9.18 },
    { name: "Düsseldorf", lat: 51.23, lng: 6.78 }, { name: "Leipzig", lat: 51.34, lng: 12.37 },
    { name: "Dortmund", lat: 51.51, lng: 7.47 },
  ],
  356: [
    { name: "Delhi", lat: 28.61, lng: 77.21 }, { name: "Mumbai", lat: 19.08, lng: 72.88 },
    { name: "Bengaluru", lat: 12.97, lng: 77.59 }, { name: "Kolkata", lat: 22.57, lng: 88.36 },
    { name: "Chennai", lat: 13.08, lng: 80.27 }, { name: "Hyderabad", lat: 17.39, lng: 78.49 },
    { name: "Ahmedabad", lat: 23.02, lng: 72.57 }, { name: "Pune", lat: 18.52, lng: 73.86 },
    { name: "Jaipur", lat: 26.91, lng: 75.79 }, { name: "Surat", lat: 21.17, lng: 72.83 },
    { name: "Lucknow", lat: 26.85, lng: 80.95 },
  ],
  360: [
    { name: "Jakarta", lat: -6.21, lng: 106.85 }, { name: "Surabaya", lat: -7.25, lng: 112.75 },
    { name: "Bandung", lat: -6.91, lng: 107.61 }, { name: "Medan", lat: 3.6, lng: 98.67 },
    { name: "Makassar", lat: -5.15, lng: 119.43 }, { name: "Semarang", lat: -6.97, lng: 110.42 },
    { name: "Palembang", lat: -2.98, lng: 104.76 }, { name: "Denpasar", lat: -8.65, lng: 115.22 },
  ],
  380: [
    { name: "Roma", lat: 41.9, lng: 12.5 }, { name: "Milano", lat: 45.46, lng: 9.19 },
    { name: "Napoli", lat: 40.85, lng: 14.27 }, { name: "Torino", lat: 45.07, lng: 7.69 },
    { name: "Venezia", lat: 45.44, lng: 12.32 }, { name: "Bologna", lat: 44.49, lng: 11.34 },
    { name: "Firenze", lat: 43.77, lng: 11.26 }, { name: "Palermo", lat: 38.12, lng: 13.36 },
    { name: "Genova", lat: 44.41, lng: 8.93 },
  ],
  392: [
    { name: "Tokyo", lat: 35.68, lng: 139.69 }, { name: "Osaka", lat: 34.69, lng: 135.5 },
    { name: "Nagoya", lat: 35.18, lng: 136.91 }, { name: "Fukuoka", lat: 33.59, lng: 130.4 },
    { name: "Sapporo", lat: 43.06, lng: 141.35 }, { name: "Yokohama", lat: 35.44, lng: 139.64 },
    { name: "Kyoto", lat: 35.01, lng: 135.77 }, { name: "Kobe", lat: 34.69, lng: 135.2 },
    { name: "Hiroshima", lat: 34.39, lng: 132.46 }, { name: "Sendai", lat: 38.27, lng: 140.87 },
  ],
  484: [
    { name: "Ciudad de México", lat: 19.43, lng: -99.13 }, { name: "Guadalajara", lat: 20.68, lng: -103.35 },
    { name: "Monterrey", lat: 25.69, lng: -100.32 }, { name: "Tijuana", lat: 32.51, lng: -117.04 },
    { name: "Cancún", lat: 21.16, lng: -86.85 }, { name: "Puebla", lat: 19.04, lng: -98.2 },
    { name: "León", lat: 21.12, lng: -101.68 }, { name: "Mérida", lat: 20.97, lng: -89.62 },
    { name: "Veracruz", lat: 19.17, lng: -96.13 },
  ],
  643: [
    { name: "Moskva", lat: 55.75, lng: 37.62 }, { name: "Sankt-Peterburg", lat: 59.93, lng: 30.34 },
    { name: "Novosibirsk", lat: 55.01, lng: 82.93 }, { name: "Yekaterinburg", lat: 56.84, lng: 60.61 },
    { name: "Kazan", lat: 55.79, lng: 49.12 }, { name: "Nizhny Novgorod", lat: 56.3, lng: 43.94 },
    { name: "Samara", lat: 53.2, lng: 50.15 }, { name: "Omsk", lat: 54.99, lng: 73.37 },
    { name: "Krasnoyarsk", lat: 56.01, lng: 92.85 }, { name: "Rostov", lat: 47.24, lng: 39.71 },
  ],
  682: [
    { name: "Riyadh", lat: 24.71, lng: 46.68 }, { name: "Jeddah", lat: 21.49, lng: 39.19 },
    { name: "Dammam", lat: 26.43, lng: 50.1 }, { name: "Mecca", lat: 21.39, lng: 39.86 },
    { name: "Medina", lat: 24.52, lng: 39.57 }, { name: "Tabuk", lat: 28.38, lng: 36.57 },
    { name: "Abha", lat: 18.22, lng: 42.51 }, { name: "Buraydah", lat: 26.33, lng: 43.97 },
  ],
  710: [
    { name: "Johannesburg", lat: -26.2, lng: 28.05 }, { name: "Cape Town", lat: -33.92, lng: 18.42 },
    { name: "Durban", lat: -29.86, lng: 31.03 }, { name: "Pretoria", lat: -25.75, lng: 28.19 },
    { name: "Gqeberha", lat: -33.96, lng: 25.6 }, { name: "Bloemfontein", lat: -29.09, lng: 26.16 },
    { name: "East London", lat: -33.02, lng: 27.91 },
  ],
  410: [
    { name: "Seoul", lat: 37.57, lng: 126.98 }, { name: "Busan", lat: 35.18, lng: 129.08 },
    { name: "Incheon", lat: 37.46, lng: 126.71 }, { name: "Daegu", lat: 35.87, lng: 128.6 },
    { name: "Daejeon", lat: 36.35, lng: 127.38 }, { name: "Gwangju", lat: 35.16, lng: 126.85 },
    { name: "Ulsan", lat: 35.54, lng: 129.31 },
  ],
  792: [
    { name: "İstanbul", lat: 41.01, lng: 28.98 }, { name: "Ankara", lat: 39.93, lng: 32.86 },
    { name: "İzmir", lat: 38.42, lng: 27.14 }, { name: "Antalya", lat: 36.9, lng: 30.7 },
    { name: "Bursa", lat: 40.19, lng: 29.06 }, { name: "Adana", lat: 37.0, lng: 35.32 },
    { name: "Gaziantep", lat: 37.07, lng: 37.38 }, { name: "Konya", lat: 37.87, lng: 32.48 },
    { name: "Kayseri", lat: 38.73, lng: 35.49 },
  ],
  826: [
    { name: "London", lat: 51.51, lng: -0.13 }, { name: "Manchester", lat: 53.48, lng: -2.24 },
    { name: "Birmingham", lat: 52.49, lng: -1.89 }, { name: "Glasgow", lat: 55.86, lng: -4.25 },
    { name: "Bristol", lat: 51.45, lng: -2.59 }, { name: "Leeds", lat: 53.8, lng: -1.55 },
    { name: "Liverpool", lat: 53.41, lng: -2.99 }, { name: "Newcastle", lat: 54.98, lng: -1.61 },
    { name: "Cardiff", lat: 51.48, lng: -3.18 }, { name: "Belfast", lat: 54.6, lng: -5.93 },
  ],
  840: [
    { name: "New York", lat: 40.71, lng: -74.01 }, { name: "Los Angeles", lat: 34.05, lng: -118.24 },
    { name: "Chicago", lat: 41.88, lng: -87.63 }, { name: "Houston", lat: 29.76, lng: -95.37 },
    { name: "Dallas", lat: 32.78, lng: -96.8 }, { name: "Atlanta", lat: 33.75, lng: -84.39 },
    { name: "Denver", lat: 39.74, lng: -104.99 }, { name: "San Francisco", lat: 37.77, lng: -122.42 },
    { name: "Seattle", lat: 47.61, lng: -122.33 }, { name: "Miami", lat: 25.76, lng: -80.19 },
    { name: "Phoenix", lat: 33.45, lng: -112.07 }, { name: "Boston", lat: 42.36, lng: -71.06 },
    { name: "Minneapolis", lat: 44.98, lng: -93.27 },
  ],
};
