// Major navigable inland waterways (hidrovias) — curated polylines following the
// course of the world's main commercial rivers. [lat, lng] downstream->upstream.

export interface Waterway {
  name: string;
  waypoints: Array<[number, number]>;
}

export const WATERWAYS: Waterway[] = [
  { name: "Amazonas", waypoints: [[-0.7, -50.0], [-2.5, -54.7], [-3.1, -60.0], [-3.3, -64.7], [-3.7, -73.2]] },
  { name: "Paraná-Paraguai", waypoints: [[-34.0, -58.4], [-32.9, -60.7], [-27.5, -58.8], [-25.3, -57.6], [-22.0, -57.9], [-19.0, -57.6]] },
  { name: "Mississippi", waypoints: [[29.2, -89.3], [30.0, -91.2], [35.1, -90.05], [38.6, -90.2], [41.5, -90.6], [44.98, -93.27]] },
  { name: "São Lourenço", waypoints: [[49.0, -64.0], [47.5, -70.0], [46.8, -71.2], [45.5, -73.6], [44.2, -76.5], [43.6, -79.4]] },
  { name: "Yangtze", waypoints: [[31.4, 121.5], [32.1, 118.8], [30.6, 114.3], [29.6, 111.7], [29.6, 106.5]] },
  { name: "Huang He", waypoints: [[37.8, 119.2], [36.7, 116.0], [34.8, 113.6], [37.5, 110.0], [36.1, 103.8]] },
  { name: "Ganges", waypoints: [[22.5, 88.3], [24.6, 87.85], [25.6, 85.1], [25.3, 83.0], [26.4, 80.3]] },
  { name: "Mekong", waypoints: [[10.0, 106.5], [11.6, 104.9], [13.1, 105.3], [15.1, 105.8], [17.97, 102.6]] },
  { name: "Reno (Rhine)", waypoints: [[51.9, 4.5], [51.5, 6.1], [50.94, 6.96], [49.5, 8.5], [47.6, 7.6]] },
  { name: "Danúbio", waypoints: [[45.2, 29.7], [44.4, 26.1], [44.0, 22.6], [44.8, 20.5], [47.5, 19.0], [48.2, 16.4]] },
  { name: "Volga", waypoints: [[46.3, 48.0], [48.7, 44.5], [51.5, 46.0], [53.2, 50.1], [55.8, 49.1], [56.3, 44.0]] },
  { name: "Nilo", waypoints: [[31.5, 30.4], [30.0, 31.2], [26.5, 31.7], [24.1, 32.9], [18.2, 31.8], [15.6, 32.5]] },
  { name: "Congo", waypoints: [[-6.0, 12.4], [-5.0, 13.4], [-4.3, 15.3], [-2.5, 18.0], [0.5, 25.2]] },
  { name: "Ródano", waypoints: [[43.3, 4.8], [43.7, 4.6], [44.4, 4.8], [45.76, 4.84]] },
];
